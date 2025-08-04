import { Contact, ContactFormData, ContactFilters, ContactStats } from '../types/contact';

export interface DatabaseConfig {
  dbPath: string;
  autoBackup: boolean;
  backupInterval: number; // in milliseconds
}

export class SQLiteContactDatabase {
  private db: any = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      dbPath: config.dbPath || './contacts.db',
      autoBackup: config.autoBackup !== false,
      backupInterval: config.backupInterval || 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // In a real implementation, this would use a proper SQLite library
      // For now, we'll create a mock implementation that simulates SQLite behavior
      // but still uses localStorage for persistence

      this.db = {
        contacts: new Map<string, Contact>(),
        transactions: [],
        isOpen: true
      };

      await this.createTables();
      await this.loadFromStorage();
      this.isInitialized = true;

      if (this.config.autoBackup) {
        this.scheduleBackup();
      }
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // In a real SQLite implementation, this would create the actual tables
    // For now, we'll simulate the table structure
    const tableSchema = {
      contacts: `
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          company TEXT,
          jobTitle TEXT,
          address_street TEXT,
          address_city TEXT,
          address_state TEXT,
          address_zipCode TEXT,
          address_country TEXT,
          notes TEXT,
          tags TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          isFavorite INTEGER DEFAULT 0,
          avatar TEXT
        )
      `,
      tags: `
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT '#007bff'
        )
      `,
      contact_tags: `
        CREATE TABLE IF NOT EXISTS contact_tags (
          contact_id TEXT,
          tag_id INTEGER,
          FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
          PRIMARY KEY (contact_id, tag_id)
        )
      `
    };

    // Simulate table creation
    console.log('Creating database tables...');
    Object.values(tableSchema).forEach(sql => {
      console.log('Executing:', sql);
    });
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('sqlite-contacts-backup');
      if (stored) {
        const data = JSON.parse(stored);
        this.db.contacts = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load contacts from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = Object.fromEntries(this.db.contacts);
      localStorage.setItem('sqlite-contacts-backup', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async createContact(contactData: ContactFormData): Promise<Contact> {
    await this.ensureInitialized();

    const id = this.generateId();
    const now = new Date();

    const contact: Contact = {
      id,
      ...contactData,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      tags: contactData.tags || []
    };

    this.db.contacts.set(id, contact);
    await this.saveToStorage();

    console.log(`SQLite: Created contact with ID ${id}`);
    return contact;
  }

  async getContact(id: string): Promise<Contact | null> {
    await this.ensureInitialized();
    return this.db.contacts.get(id) || null;
  }

  async getAllContacts(): Promise<Contact[]> {
    await this.ensureInitialized();
    return Array.from(this.db.contacts.values());
  }

  async updateContact(id: string, contactData: Partial<ContactFormData>): Promise<Contact | null> {
    await this.ensureInitialized();

    const contact = this.db.contacts.get(id);
    if (!contact) return null;

    const updatedContact: Contact = {
      ...contact,
      ...contactData,
      updatedAt: new Date(),
      tags: contactData.tags || contact.tags
    };

    this.db.contacts.set(id, updatedContact);
    await this.saveToStorage();

    console.log(`SQLite: Updated contact with ID ${id}`);
    return updatedContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    await this.ensureInitialized();

    const deleted = this.db.contacts.delete(id);
    if (deleted) {
      await this.saveToStorage();
      console.log(`SQLite: Deleted contact with ID ${id}`);
    }
    return deleted;
  }

  async searchContacts(filters: ContactFilters): Promise<Contact[]> {
    await this.ensureInitialized();

    let results = Array.from(this.db.contacts.values());

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      results = results.filter(contact =>
        contact.firstName.toLowerCase().includes(searchTerm) ||
        contact.lastName.toLowerCase().includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm))
      );
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(contact =>
        filters.tags!.some(tag => contact.tags.includes(tag))
      );
    }

    // Favorite filter
    if (filters.isFavorite !== undefined) {
      results = results.filter(contact => contact.isFavorite === filters.isFavorite);
    }

    // Sorting
    if (filters.sortBy) {
      results.sort((a, b) => {
        let aValue: any = a[filters.sortBy!];
        let bValue: any = b[filters.sortBy!];

        if (filters.sortBy === 'firstName' || filters.sortBy === 'lastName') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return results;
  }

  async toggleFavorite(id: string): Promise<Contact | null> {
    await this.ensureInitialized();

    const contact = this.db.contacts.get(id);
    if (!contact) return null;

    const updatedContact: Contact = {
      ...contact,
      isFavorite: !contact.isFavorite,
      updatedAt: new Date()
    };

    this.db.contacts.set(id, updatedContact);
    await this.saveToStorage();

    console.log(`SQLite: Toggled favorite for contact with ID ${id}`);
    return updatedContact;
  }

  async getStats(): Promise<ContactStats> {
    await this.ensureInitialized();

    const contacts = Array.from(this.db.contacts.values());
    const byTag: Record<string, number> = {};

    contacts.forEach(contact => {
      contact.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
    });

    return {
      total: contacts.length,
      favorites: contacts.filter(c => c.isFavorite).length,
      withEmail: contacts.filter(c => c.email).length,
      withPhone: contacts.filter(c => c.phone).length,
      byTag
    };
  }

  async exportContacts(): Promise<string> {
    await this.ensureInitialized();
    const contacts = Array.from(this.db.contacts.values());
    return JSON.stringify(contacts, null, 2);
  }

  async importContacts(jsonData: string): Promise<number> {
    await this.ensureInitialized();

    try {
      const contacts: Contact[] = JSON.parse(jsonData);
      let imported = 0;

      for (const contact of contacts) {
        if (contact.id && !this.db.contacts.has(contact.id)) {
          this.db.contacts.set(contact.id, contact);
          imported++;
        }
      }

      await this.saveToStorage();
      console.log(`SQLite: Imported ${imported} contacts`);
      return imported;
    } catch (error) {
      console.error('Failed to import contacts:', error);
      throw new Error('Invalid import data format');
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    this.db.contacts.clear();
    await this.saveToStorage();
    console.log('SQLite: Cleared all contacts');
  }

  async backup(): Promise<string> {
    await this.ensureInitialized();
    const backupPath = `${this.config.dbPath}.backup.${Date.now()}`;
    const data = await this.exportContacts();

    // In a real implementation, this would write to the file system
    localStorage.setItem(`backup-${Date.now()}`, data);

    console.log(`SQLite: Created backup at ${backupPath}`);
    return backupPath;
  }

  async restore(backupPath: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // In a real implementation, this would read from the file system
      const backupData = localStorage.getItem(backupPath);
      if (backupData) {
        await this.importContacts(backupData);
        console.log(`SQLite: Restored from backup ${backupPath}`);
      }
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db && this.db.isOpen) {
      await this.saveToStorage();
      this.db.isOpen = false;
      this.isInitialized = false;
      console.log('SQLite: Database closed');
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private scheduleBackup(): void {
    setInterval(async () => {
      try {
        await this.backup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, this.config.backupInterval);
  }

  // Database maintenance methods
  async vacuum(): Promise<void> {
    await this.ensureInitialized();
    console.log('SQLite: Running VACUUM operation');
    // In a real SQLite implementation, this would optimize the database
  }

  async analyze(): Promise<any> {
    await this.ensureInitialized();
    console.log('SQLite: Running ANALYZE operation');
    // In a real SQLite implementation, this would update table statistics
    return {
      tableCount: 1,
      contactCount: this.db.contacts.size,
      databaseSize: 'simulated'
    };
  }
}
