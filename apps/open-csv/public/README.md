# Open CSV File Online

A private, browser-based tool for previewing and editing CSV files. Your files are processed locally in your browser and are never uploaded to a server.

## Features

- Open CSV files by dragging and dropping, selecting a local file, or pasting from the clipboard
- Supports CSV files up to 25 MB
- Search across all columns with yellow keyword highlighting
- Sort columns in ascending or descending order
- Resize columns by dragging the edge of a column header
- Double-click a column edge to restore its automatic width
- Show or hide individual columns
- Select a cell with one click and press Enter to edit it
- Press Enter again to save and move to the cell below
- Insert a line break with Option + Enter on macOS or Alt + Enter on Windows
- Drag the fill handle to copy a value vertically across multiple cells
- Select a full row by clicking its row number
- Select a full column by clicking its header
- Delete a selected row or column with Delete or Backspace
- Undo with Ctrl/Command + Z
- Redo with Ctrl/Command + Shift + Z or Ctrl + Y on Windows
- Export the current filtered, sorted, and visible view
- Available in 40 languages, including right-to-left layouts
- Switch languages without refreshing the page or losing the current CSV data

## How to Use

### Open a CSV File

On the initial screen, you can:

1. Drag a `.csv` file into the upload area.
2. Click **Select CSV file** and choose a file from your device.
3. Click **Paste from clipboard**, or press Ctrl/Command + V on the empty screen to paste CSV text.

### Search Data

After opening a file, enter a keyword in the search field. The table displays matching rows and highlights matching text in yellow.

Keyboard shortcut: Ctrl/Command + F.

### Sort and Resize Columns

- Click a column header to sort it in ascending order.
- Click it again to sort it in descending order.
- Drag the right edge of a column header to change its width.
- Double-click the right edge to restore the automatic width.
- Use the **Columns** menu to show or hide columns.

### Edit Cells

1. Click a cell to select it.
2. Press Enter or double-click the cell to enter edit mode.
3. Press Enter again to save and select the cell below.
4. Press Esc to cancel the current edit.
5. Use Option + Enter on macOS or Alt + Enter on Windows to insert a line break.

When a cell is selected, pasting text changes only that cell. It does not replace the entire CSV file.

### Fill Multiple Cells

Select a cell and drag the blue fill handle in its lower-right corner. Every cell in the selected vertical range receives the starting cell's value. The operation can be undone.

### Delete Rows or Columns

- Click a row number to select the entire row.
- Click a column header to select the entire column.
- Press Delete or Backspace to remove the selected row or column.
- At least one column must remain.

### Undo and Redo

- Undo: Ctrl/Command + Z
- Redo: Ctrl/Command + Shift + Z
- Windows redo alternative: Ctrl + Y

The tool stores up to 100 recent data changes.

### Export a CSV File

Click **Export current view** to download the current table view. The exported file includes:

- Rows matching the current search
- The current sorting order
- Only visible columns
- All saved cell edits

## Privacy

- CSV files are never uploaded to a server.
- Parsing, searching, editing, and exporting happen locally in your browser.
- Refreshing or closing the page clears the current data.
- The browser displays a warning before leaving a page that contains an open CSV file.

## Built With

This project uses the following open-source libraries:

- [Vue.js 3](https://vuejs.org/) — reactive user interface and application state. The production runtime is loaded from jsDelivr.
- [Papa Parse](https://www.papaparse.com/) — CSV parsing, including headers, quoted fields, escaped delimiters, multiline values, and parse errors.
- [Lucide](https://lucide.dev/) — interface icons through `lucide-vue-next`.
- [Vite](https://vite.dev/) — development server and production bundling.
- [Tailwind CSS](https://tailwindcss.com/) — CSS tooling and utility generation.
- [PostCSS](https://postcss.org/) and [Autoprefixer](https://github.com/postcss/autoprefixer) — production CSS processing and browser prefixing.

Vue, Papa Parse, Vite, Tailwind CSS, PostCSS, and Autoprefixer are distributed under the MIT License. Lucide is distributed under the ISC License. Copyright and license terms remain with their respective authors.

## Languages

English is available at the site root. Other languages use separate paths, for example:

- `/zh/` — Simplified Chinese
- `/zh-tw/` — Traditional Chinese
- `/ja/` — Japanese
- `/de/` — German
- `/fr/` — French

Switching languages inside the application does not reload the CSV. Opening a language URL directly provides localized interface text, page metadata, visible fallback content, and SEO annotations.

## Deployment

The `dist` directory is a complete static website. It can be uploaded directly to GitHub Pages or another static hosting service.

Important files:

- `index.html` — English entry page
- `<language-code>/index.html` — Localized entry pages
- `assets/` — JavaScript and CSS bundles
- `sitemap.xml` — Sitemap for all 40 language pages
- `README.md` — This documentation

Production website: <https://csv-open.github.io/>
