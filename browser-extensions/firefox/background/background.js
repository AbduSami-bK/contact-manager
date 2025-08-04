/**
 * Firefox Contact Manager Background Script
 * Handles all contact management operations and storage
 */

class FirefoxContactManager {
  constructor() {
    this.initializeListeners();
    this.handleInstallation();
  }

  initializeListeners() {
    // Listen for messages from popup and content scripts
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Handle extension installation
    browser.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle browser startup
    browser.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      let response;

      switch (request.action) {
        case 'getContacts':
          response = await this.getContacts();
          break;
        case 'saveContact':
          response = await this.saveContact(request.data);
          break;
        case 'updateContact':
          response = await this.updateContact(request.id, request.data);
          break;
        case 'deleteContact':
          response = await this.deleteContact(request.id);
          break;
        case 'searchContacts':
          response = await this.searchContacts(request.query);
          break;
        case 'getStats':
          response = await this.getStats();
          break;
        case 'exportContacts':
          response = await this.exportContacts();
          break;
        case 'importContacts':
          response = await this.importContacts(request.data);
          break;
        case 'toggleFavorite':
          response = await this.toggleFavorite(request.id);
          break;
        case 'clearAll':
          response = await this.clearAll();
          break;
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      sendResponse({ success: true, data: response });
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getContacts() {
    try {
      const result = await browser.storage.local.get('contacts');
      return result.contacts || [];
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return [];
    }
  }

  async saveContacts(contacts) {
    try {
      await browser.storage.local.set({ contacts });
      return true;
    } catch (error) {
      console.error('Failed to save contacts:', error);
      throw error;
    }
  }

  async saveContact(contactData) {
    const contacts = await this.getContacts();
    const newContact = {
      id: this.generateId(),
      ...contactData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      tags: contactData.tags || []
    };

    contacts.push(newContact);
    await this.saveContacts(contacts);
    return newContact;
  }

  async updateContact(id, contactData) {
    const contacts = await this.getContacts();
    const index = contacts.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error('Contact not found');
    }

    contacts[index] = {
      ...contacts[index],
      ...contactData,
      updatedAt: new Date().toISOString(),
      tags: contactData.tags || contacts[index].tags
    };

    await this.saveContacts(contacts);
    return contacts[index];
  }

  async deleteContact(id) {
    const contacts = await this.getContacts();
    const filteredContacts = contacts.filter(c => c.id !== id);

    if (filteredContacts.length === contacts.length) {
      return false; // Contact not found
    }

    await this.saveContacts(filteredContacts);
    return true;
  }

  async searchContacts(query) {
    const contacts = await this.getContacts();

    if (!query) return contacts;

    const searchTerm = query.toLowerCase();
    return contacts.filter(contact =>
      contact.firstName.toLowerCase().includes(searchTerm) ||
      contact.lastName.toLowerCase().includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(searchTerm) ||
      (contact.company && contact.company.toLowerCase().includes(searchTerm)) ||
      contact.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  async getStats() {
    const contacts = await this.getContacts();
    const byTag = {};

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

  async exportContacts() {
    const contacts = await this.getContacts();
    return JSON.stringify(contacts, null, 2);
  }

  async importContacts(jsonData) {
    try {
      const contacts = JSON.parse(jsonData);
      const existingContacts = await this.getContacts();
      const existingIds = new Set(existingContacts.map(c => c.id));

      let imported = 0;
      for (const contact of contacts) {
        if (contact.id && !existingIds.has(contact.id)) {
          existingContacts.push(contact);
          imported++;
        }
      }

      await this.saveContacts(existingContacts);
      return imported;
    } catch (error) {
      console.error('Failed to import contacts:', error);
      throw new Error('Invalid import data format');
    }
  }

  async toggleFavorite(id) {
    const contacts = await this.getContacts();
    const contact = contacts.find(c => c.id === id);

    if (!contact) {
      throw new Error('Contact not found');
    }

    contact.isFavorite = !contact.isFavorite;
    contact.updatedAt = new Date().toISOString();

    await this.saveContacts(contacts);
    return contact;
  }

  async clearAll() {
    await browser.storage.local.remove('contacts');
    return true;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  handleInstallation(details) {
    console.log('Firefox Contact Manager installed:', details);

    if (details.reason === 'install') {
      this.initializeSampleData();
    }
  }

  handleStartup() {
    console.log('Firefox Contact Manager started');
  }

  async initializeSampleData() {
    try {
      const contacts = await this.getContacts();

      if (contacts.length === 0) {
        const sampleContacts = [
          {
            id: this.generateId(),
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-0123',
            company: 'Tech Corp',
            jobTitle: 'Software Engineer',
            address: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94102',
              country: 'USA'
            },
            notes: 'Lead developer on the main project',
            tags: ['work', 'developer'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: true
          },
          {
            id: this.generateId(),
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '+1-555-0456',
            company: 'Design Studio',
            jobTitle: 'UX Designer',
            address: {
              street: '456 Oak Ave',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA'
            },
            notes: 'Creative designer with excellent portfolio',
            tags: ['work', 'design'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false
          }
        ];

        await this.saveContacts(sampleContacts);
        console.log('Sample contacts initialized');
      }
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
    }
  }
}

// Initialize the contact manager
const contactManager = new FirefoxContactManager();
