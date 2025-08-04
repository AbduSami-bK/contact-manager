# Contact Manager

A comprehensive contact management system with desktop application and browser extensions for Chrome/Chromium and Firefox.

## 2. Requirements List

### General Description

A privacy-respecting contact manager system that consists of:

* A **browser extension** that detects contact info from pages the user visits
* A **desktop application** that reads/writes to a local SQLite DB
* No cloud. No background scraping. No storing of passwords or messages. Only structured contact information that the user consents to collect.

---

### Dev Spec

A Contact management system with two major components:

### 1. Browser Extension (Firefox and Chrome)

* Detects contact information (name, phone, email, address, company, title, etc.) on webpages the user manually visits
* Shows a popup asking the user if they want to save detected contact info
* If confirmed, stores that info in a **local SQLite DB** (the DB file path is configured in extension settings)
* Optional: User can allow auto-save on trusted sites (like Gmail, LinkedIn, GitHub, etc.)
* No scraping, no background execution, no data sent to cloud — only on-screen visible data

### 2. Desktop App (Electron or Python + GUI)

* Connects to the same SQLite DB
* Allows user to search/filter/sort contacts
* Allows user to import/export contact info (.vcf, .csv etc)
* Allows user to manually edit contact details
* Allows user to select two or more contacts to link (/ unlink) from multiple sources into a unified 'same person'.
* Can pull contacts using standard APIs from Gmail, Outlook, etc. if user logs in via OAuth
* Provides a “Search on platform” button that opens Facebook/LinkedIn/Google with a pre-filled search query

### Data Model

Contact: (Not exhaustive)

* `display picture`
* `full_name`
* `email`
* `phone_numbers` (list)
* `profile / portfolio links` (list)
* `location`
  * `home`
  * `work`
* `job_title`
* `company`
* `tags` (e.g., friend, colleague, etc.)
* `source_url`
* `date_saved`
* `notes`
* `link_id` (for linking same-person contacts)

### Tech Stack

* Browser Extension: JS/TS + Manifest v3 + IndexedDB/SQLite via Native Messaging
* Desktop App: Python (PySide, tkinter) or Electron (JS) — you choose what integrates better
* Storage: SQLite with simple schema
* Optional: Sync config using `~/.config/contact-manager/config.json`


## Contributors

**Major Contributors:**
- **Claude Sonnet 4** - Lead Developer & Architect
  - Designed and implemented the complete project architecture
  - Created the SQLite database layer with backup and maintenance features
  - Developed the Electron desktop application with modern UI/UX
  - Built both Chrome/Chromium (Manifest V3) and Firefox browser extensions
  - Implemented contact extraction and web integration features
  - Created comprehensive validation and utility systems
  - Designed responsive layouts and cross-platform compatibility

## Features

### Core Features
- **Contact Management**: Add, edit, delete, and organize contacts
- **SQLite Database**: Robust database layer with automatic backups and maintenance
- **Search & Filter**: Powerful search with filters for favorites, tags, and more
- **Import/Export**: JSON-based import and export functionality
- **Favorites**: Mark and filter favorite contacts
- **Tags**: Organize contacts with custom tags
- **Statistics**: View contact statistics and insights
- **Responsive Design**: Works on desktop and mobile devices

### Desktop Application
- **Electron-based**: Cross-platform desktop application
- **Modern UI**: Clean, professional interface with smooth animations
- **File Operations**: Native file dialogs for import/export
- **Persistent Storage**: Local data storage with automatic backups
- **Keyboard Shortcuts**: Quick access to common actions

### Database Layer
- **SQLite Implementation**: Robust database with table schemas and relationships
- **Automatic Backups**: Scheduled backup system with configurable intervals
- **Database Maintenance**: VACUUM and ANALYZE operations for optimization
- **Fallback Storage**: localStorage support for browser environments
- **Transaction Support**: ACID-compliant data operations
- **Migration System**: Version-controlled database schema updates

### Browser Extensions
- **Chrome/Chromium**: Manifest V3 extension with popup interface
- **Firefox**: Compatible extension with similar functionality
- **Quick Access**: Fast contact lookup and management
- **Background Sync**: Persistent storage across browser sessions
- **Content Scripts**: Integration with web pages for contact extraction

## Project Structure

```
contact-manager/
├── desktop-app/           # Electron desktop application
│   ├── app/              # Main process files
│   ├── ui/               # Renderer process UI
│   ├── resources/        # App resources and icons
│   └── package.json      # Desktop app dependencies
├── browser-extensions/   # Browser extension files
│   ├── chromium/         # Chrome/Chromium extension
│   └── firefox/          # Firefox extension
├── shared/               # Shared code and types
│   ├── types/           # TypeScript type definitions
│   ├── database/        # Database layer (SQLite + localStorage fallback)
│   └── utils/           # Utility functions
├── docs/                # Documentation
└── tests/               # Test files
```

## Installation & Setup

### Desktop Application

1. **Install Dependencies**
   ```bash
   cd desktop-app
   npm install
   ```

2. **Run in Development Mode**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Package for Distribution**
   ```bash
   npm run dist
   ```

### Browser Extensions

#### Chrome/Chromium Extension

1. **Load Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `browser-extensions/chromium/` folder

2. **Use Extension**
   - Click the extension icon in the toolbar
   - Use the popup interface to manage contacts
   - Access full features through the extension

#### Firefox Extension

1. **Load Extension**
   - Open Firefox and go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file in `browser-extensions/firefox/`

## Usage

### Adding Contacts
1. Click the "Add Contact" button
2. Fill in the required fields (First Name, Last Name, Email, Phone)
3. Optionally add company, job title, address, tags, and notes
4. Click "Save Contact"

### Managing Contacts
- **Search**: Use the search bar to find contacts by name, email, phone, or company
- **Filter**: Use the sidebar filters to show favorites only or sort by different criteria
- **Edit**: Click the edit button on any contact card
- **Delete**: Click the delete button and confirm the action
- **Favorite**: Click the star icon to toggle favorite status

### Import/Export
- **Export**: Click the export button to save all contacts as JSON
- **Import**: Click the import button to load contacts from a JSON file
- **Format**: The JSON should be an array of contact objects with the required fields

### Browser Extension Features
- **Quick Search**: Search contacts directly from the popup
- **Quick Add**: Add new contacts without opening the full interface
- **Statistics**: View contact counts and favorites
- **Full View**: Open the complete interface in a new tab

## Data Structure

### Contact Object
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  jobTitle?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  avatar?: string;
}
```

## Development

### Shared Code
The `shared/` directory contains code used across all platforms:
- **Types**: TypeScript interfaces and type definitions
- **Database**: Contact storage and management logic
- **Utils**: Validation, formatting, and utility functions

### Adding Features
1. **Desktop App**: Modify files in `desktop-app/ui/` for UI changes
2. **Browser Extensions**: Update files in respective browser folders
3. **Shared Logic**: Add common functionality in `shared/` directory

### Testing
```bash
# Run tests
npm test

# Run specific test suites
npm run test:desktop
npm run test:extension
```

## Browser Support

### Desktop Application
- Windows 10/11
- macOS 10.14+
- Linux (Ubuntu 18.04+, CentOS 7+)

### Browser Extensions
- Chrome 88+
- Chromium 88+
- Firefox 85+
- Edge 88+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the documentation in the `docs/` folder
2. Search existing issues
3. Create a new issue with detailed information

## Roadmap

- [ ] Contact groups and categories
- [ ] Advanced search filters
- [ ] Local contact sharing (file-based)
- [ ] Mobile applications
- [ ] Offline backup and restore
- [ ] Contact templates
- [ ] Birthday reminders
- [ ] Contact history tracking
- [ ] Offline-first improvements
