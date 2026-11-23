import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, statSync } from 'fs'
import { extname } from 'path'
import { getApiKey } from './settings.js'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — Anthropic API limit

const PROMPT = `You are extracting cocktail/drink recipe data from a photo of a recipe card, recipe sheet, or bar book page.

The image may contain ONE or MULTIPLE recipes. Extract ALL of them.

Return ONLY a valid JSON array containing every recipe found, each with this structure:
[
  {
    "name": "drink name",
    "glass": "glass type (e.g. 12 oz. Highball)",
    "method": "preparation method (e.g. Shake & strain)",
    "ingredients": [
      {"amount": "1.50", "unit": "oz", "name": "ingredient name"}
    ],
    "garnishes": [
      {"amount": "1.00", "unit": "ea.", "name": "garnish name"}
    ],
    "note": "any special notes or asterisk instructions (empty string if none)"
  }
]

Rules:
- Always return a JSON array, even when there is only one recipe
- amounts should be numbers as strings ("1.50", "0.75", "4")
- unit should be the abbreviation as written (oz, ea., dash, tsp, etc.)
- if a field is missing, use "" for text fields or [] for arrays
- return ONLY the JSON array — no explanation, no markdown, no code fences`

function mediaType(filePath) {
  const ext = extname(filePath).toLowerCase()
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'image/jpeg'
}

export async function importRecipeFromPhoto(imagePath) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_API_KEY')

  const size = statSync(imagePath).size
  if (size > MAX_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(1)
    throw new Error(`IMAGE_TOO_LARGE:${mb}`)
  }

  const imageData = readFileSync(imagePath).toString('base64')
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType(imagePath), data: imageData } },
          { type: 'text', text: PROMPT }
        ]
      }
    ]
  })

  const text = response.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`PARSE_ERROR:${text.substring(0, 300)}`)
  }

  // Always return an array
  return Array.isArray(parsed) ? parsed : [parsed]
}
