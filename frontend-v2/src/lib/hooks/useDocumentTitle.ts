// Sets document.title to "<Page> · Renoog AI", or just "Renoog AI" with no page.
import { useEffect } from 'react'

export const APP_NAME = 'Renoog AI'

export function formatTitle(page?: string): string {
  return page ? `${page} · ${APP_NAME}` : APP_NAME
}

export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = formatTitle(page)
  }, [page])
}
