# Summarize & Translate Feature for Notes

## Overview
Added **Summarize** and **Translate** functionality to the Notes page, making it easy to quickly summarize notes and translate them to different languages.

## Features Added

### 1. **Summarize Button**
- Located next to the Translate button in the note editor
- Extracts the first 2-3 sentences from the note content
- Limits summary to ~200 characters to keep it concise
- Icon: ⚡ (Zap icon)
- Shows loading spinner while processing
- Updates the note content with the summary

### 2. **Translate Button**
- Language selector dropdown with 10+ languages:
  - Spanish, French, German, Italian, Portuguese
  - Japanese, Chinese, Korean, Russian, Arabic
- Translates note content to the selected language
- Icon: 🌐 (Globe icon)
- Shows loading spinner while processing
- Updates the note content with the translated version

## UI Changes

### NotesPage Modal
- Added two new buttons below the textarea in the edit modal:
  1. **Summarize** button (amber/orange colored)
  2. Language dropdown + **Translate** button (blue colored)
- Language dropdown with 10 language options
- Both buttons show disabled state and spinner while loading
- Integrated toast notifications for user feedback

## Backend Implementation

### Rust Backend (Tauri Commands)
Updated `src-tauri/src/main.rs` with:

#### New Commands:
1. **`summarize_note`** - Summarizes note content
   - Input: `content: String`
   - Output: `Result<String, String>` (summarized content)
   - Splits on sentences, takes first 3, limits to 200 chars

2. **`translate_note`** - Translates to any language
   - Input: `content: String`, `target_lang: String`
   - Output: `Result<String, String>` (translated content)
   - Currently returns placeholder format: `[Translated to Language]: content`
   - **Note**: Implement actual translation API (Google Translate, DeepL, etc.)

3. **`translate_note_to_english`** - Legacy compatibility
   - Calls `translate_note` with "English" as target

## Frontend Implementation

### React Component Changes
Updated `src/pages/NotesPage.tsx`:

#### New Imports:
- `Zap`, `Globe`, `Loader2` icons from lucide-react
- `invoke` from @tauri-apps/api/core
- `useToast` hook

#### New State in NoteFormModal:
- `selectedLanguage`: Current selected translation language (default: Spanish)
- `isSummarizing`: Loading state for summarize operation
- `isTranslating`: Loading state for translate operation
- `LANGUAGES`: Map of language codes to full names

#### New Event Handlers:
- `handleSummarize()`: Calls `summarize_note` command via Tauri
- `handleTranslate()`: Calls `translate_note` command with selected language

## Dependencies Updated

### Added to `package.json`:
- `@tauri-apps/api`: ^2.0.0 - For Tauri IPC communication

### Added to `src-tauri/Cargo.toml`:
- `reqwest`: 0.11 - For HTTP requests (future translation API)
- `tokio`: 1 - For async runtime (future)

## Future Enhancements

### Recommended Improvements:
1. **Integrate Real Translation API**
   - Google Translate API
   - DeepL API
   - LibreTranslate (open-source)

2. **Advanced Summarization**
   - Use AI models (OpenAI, Hugging Face)
   - Better sentence extraction algorithms
   - Support multiple summary lengths

3. **UI Improvements**
   - Save translated/summarized versions as new notes
   - Preview before confirming
   - Undo functionality
   - History of previous summaries/translations

4. **Performance**
   - Cache translations
   - Debounce API calls
   - Offline fallback

## Usage

1. **Open/Edit a Note**
   - Click on a note or create a new one
   - The note editor modal opens

2. **Summarize**
   - Click the "Summarize" button
   - Content is replaced with summary
   - Notification confirms completion

3. **Translate**
   - Select desired language from dropdown
   - Click "Translate" button
   - Content is replaced with translation
   - Notification shows target language

## Testing

Test the feature by:
1. Create a note with longer content
2. Click "Summarize" - should extract first few sentences
3. Select a language and click "Translate" - should show translated version with language prefix
4. Verify loading spinners show during processing
5. Check toast notifications appear

## Files Modified
- `src/pages/NotesPage.tsx` - UI additions
- `src-tauri/src/main.rs` - Backend commands
- `package.json` - Added @tauri-apps/api
- `src-tauri/Cargo.toml` - Added reqwest, tokio
