import { Contact, ContactFormData, ContactFilters, ContactStats } from '../types/contact';

export class ContactDatabase {
  private contacts: Map<string, Contact> = new Map();
  private dbName = 'contact-manager-db';
  private version = 1;

  constructor() {
    this.loadFromStorage();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.dbName);
      if (stored) {
        const data = JSON.parse(stored);
        this.contacts = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load contacts from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.contacts);
      localStorage.setItem(this.dbName, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
    }
  }

  async createContact(contactData: ContactFormData): Promise<Contact> {
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

    this.contacts.set(id, contact);
    this.saveToStorage();
    return contact;
  }

  async getContact(id: string): Promise<Contact | null> {
    return this.contacts.get(id) || null;
  }

  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async updateContact(id: string, contactData: Partial<ContactFormData>): Promise<Contact | null> {
    const contact = this.contacts.get(id);
    if (!contact) return null;

    const updatedContact: Contact = {
      ...contact,
      ...contactData,
      updatedAt: new Date(),
      tags: contactData.tags || contact.tags
    };

    this.contacts.set(id, updatedContact);
    this.saveToStorage();
    return updatedContact;
  }

  async deleteContact(id: string): Promise<boolean> {
    const deleted = this.contacts.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  async searchContacts(filters: ContactFilters): Promise<Contact[]> {
    let results = Array.from(this.contacts.values());

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
    const contact = this.contacts.get(id);
    if (!contact) return null;

    const updatedContact: Contact = {
      ...contact,
      isFavorite: !contact.isFavorite,
      updatedAt: new Date()
    };

    this.contacts.set(id, updatedContact);
    this.saveToStorage();
    return updatedContact;
  }

  async getStats(): Promise<ContactStats> {
    const contacts = Array.from(this.contacts.values());
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
    const contacts = Array.from(this.contacts.values());
    return JSON.stringify(contacts, null, 2);
  }

  async importContacts(jsonData: string): Promise<number> {
    try {
      const contacts: Contact[] = JSON.parse(jsonData);
      let imported = 0;

      for (const contact of contacts) {
        if (contact.id && !this.contacts.has(contact.id)) {
          this.contacts.set(contact.id, contact);
          imported++;
        }
      }

      this.saveToStorage();
      return imported;
    } catch (error) {
      console.error('Failed to import contacts:', error);
      throw new Error('Invalid import data format');
    }
  }

  async clearAll(): Promise<void> {
    this.contacts.clear();
    this.saveToStorage();
  }
}
