// Background service worker for Contact Manager extension
class ContactManagerBackground {
    constructor() {
        this.initializeListeners();
    }

    initializeListeners() {
        // Listen for messages from popup and content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Handle extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'getContacts':
                    const contacts = await this.getContacts();
                    sendResponse({ success: true, data: contacts });
                    break;

                case 'saveContact':
                    const savedContact = await this.saveContact(request.data);
                    sendResponse({ success: true, data: savedContact });
                    break;

                case 'updateContact':
                    const updatedContact = await this.updateContact(request.id, request.data);
                    sendResponse({ success: true, data: updatedContact });
                    break;

                case 'deleteContact':
                    const deleted = await this.deleteContact(request.id);
                    sendResponse({ success: true, data: deleted });
                    break;

                case 'searchContacts':
                    const searchResults = await this.searchContacts(request.query);
                    sendResponse({ success: true, data: searchResults });
                    break;

                case 'getStats':
                    const stats = await this.getStats();
                    sendResponse({ success: true, data: stats });
                    break;

                case 'exportContacts':
                    const exportData = await this.exportContacts();
                    sendResponse({ success: true, data: exportData });
                    break;

                case 'importContacts':
                    const importResult = await this.importContacts(request.data);
                    sendResponse({ success: true, data: importResult });
                    break;

                case 'toggleFavorite':
                    const toggledContact = await this.toggleFavorite(request.id);
                    sendResponse({ success: true, data: toggledContact });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async getContacts() {
        const result = await chrome.storage.local.get(['contacts']);
        return result.contacts || [];
    }

    async saveContacts(contacts) {
        await chrome.storage.local.set({ contacts });
    }

    async saveContact(contactData) {
        const contacts = await this.getContacts();
        const newContact = {
            id: this.generateId(),
            ...contactData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isFavorite: false
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
            updatedAt: new Date().toISOString()
        };

        await this.saveContacts(contacts);
        return contacts[index];
    }

    async deleteContact(id) {
        const contacts = await this.getContacts();
        const filteredContacts = contacts.filter(c => c.id !== id);
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
            (contact.company && contact.company.toLowerCase().includes(searchTerm))
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
            const importedContacts = JSON.parse(jsonData);
            const existingContacts = await this.getContacts();
            let imported = 0;

            for (const contact of importedContacts) {
                if (contact.id && !existingContacts.find(c => c.id === contact.id)) {
                    existingContacts.push(contact);
                    imported++;
                }
            }

            await this.saveContacts(existingContacts);
            return { imported, total: existingContacts.length };
        } catch (error) {
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

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            // Initialize with sample data
            this.initializeSampleData();
        }
    }

    handleStartup() {
        // Handle extension startup
        console.log('Contact Manager extension started');
    }

    async initializeSampleData() {
        const contacts = await this.getContacts();
        if (contacts.length === 0) {
            const sampleContacts = [
                {
                    id: this.generateId(),
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    phone: '(555) 123-4567',
                    company: 'Example Corp',
                    jobTitle: 'Software Engineer',
                    address: {
                        street: '123 Main St',
                        city: 'Anytown',
                        state: 'CA',
                        zipCode: '12345',
                        country: 'USA'
                    },
                    tags: ['work', 'developer'],
                    notes: 'Lead developer on the main project',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isFavorite: true
                },
                {
                    id: this.generateId(),
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@example.com',
                    phone: '(555) 987-6543',
                    company: 'Tech Solutions',
                    jobTitle: 'Product Manager',
                    address: {
                        street: '456 Oak Ave',
                        city: 'Somewhere',
                        state: 'NY',
                        zipCode: '67890',
                        country: 'USA'
                    },
                    tags: ['work', 'manager'],
                    notes: 'Great collaborator on projects',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isFavorite: false
                }
            ];

            await this.saveContacts(sampleContacts);
        }
    }
}

// Initialize the background service worker
const background = new ContactManagerBackground();
