/*
  # Shop layout JSON

  Adds two columns to `user_shops`:
   - `layout`        — JSONB blob holding the sectioned editor state
                       (banner image URL, accent color, section order,
                       section visibility, per-section settings)
   - `custom_domain` — text, future use. We seed the column now so the
                       custom-domain feature can ship without another
                       migration.

  Layout JSON shape:
    {
      "banner_url":   "https://...",
      "accent":       "#7c3aed",
      "tagline":      "Short bio shown under shop name",
      "sections":     [
        { "id": "hero",      "visible": true  },
        { "id": "featured",  "visible": true  },
        { "id": "listings",  "visible": true  },
        { "id": "reviews",   "visible": false },
        { "id": "about",     "visible": true,
          "settings": { "body": "Markdown / plain text" } }
      ],
      "card_style":   "tile" | "list" | "compact"
    }

  The migration is additive only — the existing shop branding columns
  (banner_url, accent_color, layout_style) keep working as a fallback
  for shops that haven't been edited under the new editor yet.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_shops' AND column_name = 'layout'
  ) THEN
    ALTER TABLE user_shops ADD COLUMN layout jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_shops' AND column_name = 'custom_domain'
  ) THEN
    ALTER TABLE user_shops ADD COLUMN custom_domain text;
    /* Unique-but-nullable: many rows can be NULL but no two rows can
       claim the same domain. */
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_shops_custom_domain
      ON user_shops (custom_domain) WHERE custom_domain IS NOT NULL;
  END IF;
END $$;
