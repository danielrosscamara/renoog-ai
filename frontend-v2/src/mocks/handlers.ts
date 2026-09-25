import { delay, http, HttpResponse } from 'msw'
import { apiUrl } from '@/lib/api'
import { GENRES, type CharacterSort, type Genre, type StreamEvent, type StreamRequest } from '@/lib/types'
import * as db from './data'

/**
 * Fake FastAPI routes. Paths are resolved with the same apiUrl() the app uses, so handlers
 * only match real API calls — never Vite's own module requests on the same origin.
 * delay() with no argument is a realistic latency in the browser and instant in Node (tests).
 */

const SORTS: readonly CharacterSort[] = ['recent', 'newest', 'name']
const notFound = () => HttpResponse.json({ code: 'not_found', message: 'Not found.' }, { status: 404 })

export const handlers = [
  http.get(apiUrl('/personas'), async () => {
    await delay()
    return HttpResponse.json(db.listPersonas())
  }),

  http.get(apiUrl('/personas/active'), async () => {
    await delay()
    return HttpResponse.json(db.getActivePersona())
  }),

  http.put(apiUrl('/personas/active'), async ({ request }) => {
    await delay()
    const body = (await request.json().catch(() => null)) as { personaId?: unknown } | null
    if (typeof body?.personaId !== 'string') {
      return HttpResponse.json({ code: 'validation_error', message: 'Invalid request.' }, { status: 422 })
    }
    const persona = db.setActivePersona(body.personaId)
    return persona ? HttpResponse.json(persona) : notFound()
  }),

  http.get(apiUrl('/settings'), async () => {
    await delay()
    return HttpResponse.json(db.getSettings())
  }),

  http.patch(apiUrl('/settings'), async ({ request }) => {
    await delay()
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const updated = body && typeof body === 'object' ? db.updateSettings(body) : null
    return updated
      ? HttpResponse.json(updated)
      : HttpResponse.json({ code: 'validation_error', message: 'That setting isn’t available.' }, { status: 422 })
  }),

  http.get(apiUrl('/presets'), async () => {
    await delay()
    return HttpResponse.json(db.listPresets())
  }),

  http.get(apiUrl('/models'), async () => {
    await delay()
    return HttpResponse.json(db.listModels())
  }),

  http.delete(apiUrl('/chats'), async () => {
    await delay()
    db.deleteAllChats()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(apiUrl('/chats'), async ({ request }) => {
    await delay()
    const raw = new URL(request.url).searchParams.get('limit')
    const limit = raw === null ? undefined : Number.parseInt(raw, 10)
    return HttpResponse.json(db.listChats(Number.isFinite(limit) ? limit : undefined))
  }),

  http.get(apiUrl('/chats/:id'), async ({ params }) => {
    await delay()
    const chat = db.getChat(String(params.id))
    return chat ? HttpResponse.json(chat) : notFound()
  }),

  // SSE reply in the real wire format (`event:` + `data:` JSON). Safety tiers are the
  // backend's job, so the mock only ever streams a plain reply.
  http.post(apiUrl('/chats/:id/stream'), async ({ params, request }) => {
    await delay()
    const body = (await request.json().catch(() => null)) as Partial<StreamRequest> | null
    const text = body?.text
    if (typeof text !== 'string' || text.length < 1 || text.length > 4000) {
      return HttpResponse.json({ code: 'validation_error', message: 'text: must be 1 to 4000 characters.' }, { status: 422 })
    }
    if (!db.getChat(String(params.id))) return notFound()

    const reply = ['The lamp flickers. ', 'She looks up from her book ', 'and smiles at you.']
    const events: StreamEvent[] = [
      ...reply.map((t): StreamEvent => ({ type: 'token', text: t })),
      { type: 'done', messageId: crypto.randomUUID(), status: 'ok' },
    ]
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const event of events) {
          await delay()
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
        }
        controller.close()
      },
    })
    return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } })
  }),

  http.get(apiUrl('/characters/featured'), async () => {
    await delay()
    return HttpResponse.json(db.listFeaturedCharacters())
  }),

  // After /characters/featured, so "featured" is never read as an id.
  http.get(apiUrl('/characters/:id'), async ({ params }) => {
    await delay()
    const character = db.getCharacter(String(params.id))
    return character ? HttpResponse.json(character) : notFound()
  }),

  http.get(apiUrl('/characters'), async ({ request }) => {
    await delay()
    const sp = new URL(request.url).searchParams
    const genre = sp.get('genre')
    const sort = sp.get('sort')
    return HttpResponse.json(
      db.listCharacters({
        q: sp.get('q') ?? undefined,
        genre: GENRES.includes(genre as Genre) ? (genre as Genre) : undefined,
        sort: SORTS.includes(sort as CharacterSort) ? (sort as CharacterSort) : undefined,
      }),
    )
  }),

  http.patch(apiUrl('/characters/:id'), async ({ params, request }) => {
    await delay()
    const body = (await request.json().catch(() => null)) as { bookmarked?: unknown } | null
    if (typeof body?.bookmarked !== 'boolean') {
      return HttpResponse.json({ code: 'validation_error', message: 'Invalid request.' }, { status: 422 })
    }
    const updated = db.setBookmark(String(params.id), body.bookmarked)
    return updated ? HttpResponse.json(updated) : notFound()
  }),
]
