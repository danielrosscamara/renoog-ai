import { Bookmark } from 'lucide-react';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { Avatar } from '../common/Avatar';
import type { Character } from '../../types';

interface CharacterCardProps {
  character: Character;
  onSelect: (character: Character) => void;
}

const MAX_TAGS = 3;

/**
 * Gallery card. The art is the card — full-bleed 3:4, no overlay text or
 * controls, no frame — so saturated color lives only in the image. Everything
 * readable sits below it on --surface-1, where contrast is known.
 *
 * The name button stretches over the whole card (::after) so the card is one
 * click target, while the bookmark stays a separate, non-nested button.
 */
export const CharacterCard = ({ character, onSelect }: CharacterCardProps) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const extraTags = character.tags.length - MAX_TAGS;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-border bg-surface-1 shadow-card transition-colors focus-within:border-border-hover hover:border-border-hover">
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-surface-2">
        {character.avatar_url ? (
          <img src={character.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Avatar name={character.name} size={64} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="truncate text-name font-semibold text-text">
              <button
                type="button"
                onClick={() => onSelect(character)}
                className="text-left outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-accent"
              >
                {character.name}
              </button>
            </h3>
            {character.tagline && (
              <p className="line-clamp-2 text-body text-text-dim">{character.tagline}</p>
            )}
          </div>

          <button
            type="button"
            aria-label={character.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={character.is_favorite}
            onClick={() => updateCharacter(character.id, { is_favorite: !character.is_favorite })}
            className={`relative z-10 -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-surface-2 ${
              character.is_favorite ? 'text-accent' : 'text-text-dim hover:text-text'
            }`}
          >
            <Bookmark className="h-4 w-4" fill={character.is_favorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {character.tags.length > 0 && (
          <ul className="mt-auto flex flex-wrap items-center gap-1 pt-1">
            {character.tags.slice(0, MAX_TAGS).map((tag) => (
              <li key={tag} className="rounded-full bg-surface-2 px-2 py-1 text-meta text-text-dim">
                {tag}
              </li>
            ))}
            {extraTags > 0 && <li className="meta px-1 text-text-faint">+{extraTags}</li>}
          </ul>
        )}

        {character.creator && <span className="meta truncate text-text-faint">by {character.creator}</span>}
      </div>
    </article>
  );
};
