# SPG content import guide

## Jobs
Supported columns: `title`, `location`, `type`, `salary`, `workingHours`, `summary`, `description`, `benefits`, `imageUrl`, `published`.

`title` is required. If a normalized title already exists, the row updates that record. Otherwise, a new record is created.

## Posts
Supported columns: `title`, `summary`, `content`, `imageUrl`, `published`.

`title` is required. Existing normalized titles are updated; new titles are created.

## PDF linking
PDF files are linked to an existing Post or Job by normalized filename. For example, `Nhan-vien-IT.pdf` matches the title `Nhân viên IT`.

If no matching title exists, or more than one item has the same normalized title, the preview reports an error and does not guess.

## Preview before commit
The Admin import dialog first runs a preview. It reports create, update, PDF-link, and error counts. Data is written only after `Xác nhận import`.

## Limits
- PDF, XLSX, CSV
- Up to 10 MB per file
- Up to 20 PDFs per request
- One XLSX/CSV per request
- Up to 500 spreadsheet rows per import
