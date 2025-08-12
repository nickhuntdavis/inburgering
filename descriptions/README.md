# Flashcard Descriptions - Complete Reference Guide

## What is `descriptions.json`?

`descriptions.json` is the **data source** for your Dutch KNM flashcard app. It contains all the Dutch terms, their English translations, and contextual explanations that appear on the back of each flashcard.

## What is it for?

This file serves as the **content database** for your learning app. Instead of hardcoding card content in the JavaScript files, all the learning material is stored here in a structured, easy-to-edit format.

## How it works

### 1. **App Loading Process**
```
App starts → Loads descriptions.json → Parses JSON → Creates flashcards → Shows cards to user
```

### 2. **Data Flow**
- **Front of card**: Shows the `front` field (Dutch term)
- **Back of card**: Shows the `back` field (English translation) + `description` field (context)
- **Filtering**: Uses `category` and `subcategory` for organizing cards
- **Progress tracking**: Uses `id` field to remember which cards you've learned

### 3. **Fallback System**
- Primary: `descriptions.json` (new format)
- ~~Fallback: `sentences.txt` (old format - now deleted)~~

## File Structure

```json
{
  "version": 1,                    // Schema version (for future compatibility)
  "cards": [                       // Array of all flashcard objects
    {
      // Each card is a complete learning unit
    }
  ]
}
```

## Card Object Reference

### Required Fields (Must have)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier for the card | `"huurtoeslag"` |
| `front` | string | Dutch term (front of card) | `"Huurtoeslag"` |
| `back` | string | English translation (back of card) | `"Rent allowance"` |
| `description` | string | Contextual explanation | `"Government benefit to help low income households..."` |
| `category` | string | Main topic area | `"Wonen"` |

### Optional Fields (Nice to have)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `subcategory` | string | Sub-topic for organization | `"Een huis regelen"` |
| `tags` | array | Labels for filtering/searching | `["KNM", "housing", "finance"]` |
| `pos` | string | Part of speech | `"noun"`, `"verb"`, `"phrase"` |
| `priority` | number | Deck ordering (1-3) | `1` (high), `2` (medium), `3` (low) |
| `difficulty_initial` | number | Starting difficulty (1-5) | `1` (easy), `5` (hard) |

## Field Details

### `id` (Required)
- **Purpose**: Unique identifier for progress tracking
- **Format**: URL-friendly string (lowercase, hyphens, no spaces)
- **Example**: `"wet-en-regelgeving"`, `"10-minutengesprekken"`
- **Important**: Must be unique across all cards

### `front` (Required)
- **Purpose**: What appears on the front of the flashcard
- **Format**: Dutch term exactly as it should appear
- **Example**: `"Wet- en regelgeving"`, `"10-minutengesprekken"`

### `back` (Required)
- **Purpose**: Main answer on the back of the flashcard
- **Format**: English translation or short explanation
- **Example**: `"Legislation and regulations"`, `"10-minute conversations"`

### `description` (Required)
- **Purpose**: Contextual explanation below the main answer
- **Format**: Human-readable sentence explaining what it is in real life
- **Style**: No exam references, focus on practical context
- **Example**: `"This refers to the entire system of laws and rules in the Netherlands. It's the framework that dictates what is and isn't allowed in society."`

### `category` (Required)
- **Purpose**: Main topic area for filtering and organization
- **Values**: `"Politiek"`, `"Wonen"`, `"Instanties"`, `"Werk en inkomen"`, `"Opvoeding en Onderwijs"`, `"Gezondheid"`, `"Geschiedenis en geografie"`, `"Interactie, waarden en normen"`

### `subcategory` (Optional)
- **Purpose**: More specific grouping within a category
- **Examples**: `"Wetgeving"`, `"Een huis regelen"`, `"Juridische en sociale hulp"`

### `tags` (Optional)
- **Purpose**: Additional labels for advanced filtering
- **Format**: Array of strings
- **Examples**: `["KNM", "politics", "law"]`, `["housing", "finance"]`

### `pos` (Optional)
- **Purpose**: Part of speech for language learning
- **Values**: `"noun"`, `"verb"`, `"adjective"`, `"phrase"`

### `priority` (Optional)
- **Purpose**: Deck ordering priority
- **Values**: `1` (high priority), `2` (medium), `3` (low)

### `difficulty_initial` (Optional)
- **Purpose**: Starting difficulty level for spaced repetition
- **Values**: `1` (very easy) to `5` (very difficult)

## Complete Example Card

```json
{
  "id": "huurtoeslag",
  "slug": "huurtoeslag",
  "front": "Huurtoeslag",
  "back": "Rent allowance",
  "description": "Government benefit to help low income households pay rent; you apply via the Belastingdienst.",
  "category": "Wonen",
  "subcategory": "Een huis regelen",
  "tags": ["KNM", "housing", "finance"],
  "pos": "noun",
  "priority": 1,
  "difficulty_initial": 2
}
```

## How to Use

### Adding a New Card
1. Open `descriptions.json`
2. Add a new object to the `cards` array
3. Fill in required fields (`id`, `front`, `back`, `description`, `category`)
4. Add optional fields as needed
5. Save the file
6. Refresh the app

### Editing an Existing Card
1. Find the card by `id` or `front`
2. Modify any field
3. Save the file
4. Refresh the app

### Removing a Card
1. Find the card in the `cards` array
2. Delete the entire card object
3. Save the file
4. Refresh the app

## Best Practices

### Writing Descriptions
- ✅ **Do**: Explain what it is in real life
- ✅ **Do**: Give practical context and examples. Consider the kinds of inburgeren exam questions for KPN that are asked in these exams. Provide good context for the role of this item in dutch society.
- ✅ **Do**: Use clear, simple, human, slightly informal language
- ❌ **Don't**: Reference the exam or test
- ❌ **Don't**: Use overly formal language
- ❌ **Don't**: Assume prior knowledge

### ID Naming
- ✅ **Do**: Use lowercase letters
- ✅ **Do**: Use hyphens for spaces
- ✅ **Do**: Make it descriptive
- ❌ **Don't**: Use spaces or special characters
- ❌ **Don't**: Use numbers only

### Categories
- ✅ **Do**: Use existing category names exactly
- ✅ **Do**: Create logical subcategories
- ❌ **Don't**: Invent new main categories without updating the app

## Troubleshooting

### Common Issues

**Card doesn't appear**
- Check that `id` is unique
- Verify all required fields are present
- Check JSON syntax (commas, brackets)

**Description doesn't show**
- Ensure `description` field exists and has content
- Check that `front` matches exactly (case-sensitive)

**Category filter doesn't work**
- Verify `category` matches existing categories exactly
- Check for extra spaces or typos

### JSON Validation
- Use a JSON validator to check syntax
- Ensure all brackets and braces are properly closed
- Check that all arrays and objects are properly formatted

## File Location
```
your-project/
├── descriptions/
│   ├── descriptions.json    ← This file
│   └── README.md           ← This documentation
├── app.js
├── data.js
└── index.html
```

## Version History
- **Version 1**: Initial JSON schema with basic fields
- Future versions may add new fields while maintaining backward compatibility

## Need Help?

If you encounter issues:
1. Check this README first
2. Validate your JSON syntax
3. Compare with working examples in the file
4. Ensure all required fields are present
