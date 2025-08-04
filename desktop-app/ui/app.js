// Contact Manager Desktop Application
class ContactManagerApp {
    constructor() {
        this.contacts = [];
        this.currentFilters = {
            search: '',
            isFavorite: false,
            sortBy: 'firstName',
            sortOrder: 'asc'
        };
        this.editingContactId = null;
        this.deletingContactId = null;

        this.initializeApp();
    }

    async initializeApp() {
        this.setupEventListeners();
        this.setupMenuListeners();
        await this.loadContacts();
        this.renderContacts();
        this.updateStats();
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('addContactBtn').addEventListener('click', () => this.openContactModal());
        document.getElementById('importBtn').addEventListener('click', () => this.importContacts());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportContacts());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.renderContacts();
        });

        document.getElementById('favoritesFilter').addEventListener('change', (e) => {
            this.currentFilters.isFavorite = e.target.checked;
            this.renderContacts();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentFilters.sortBy = e.target.value;
            this.renderContacts();
        });

        document.getElementById('sortOrder').addEventListener('change', (e) => {
            this.currentFilters.sortOrder = e.target.value;
            this.renderContacts();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeContactModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeContactModal());
        document.getElementById('contactForm').addEventListener('submit', (e) => this.handleContactSubmit(e));

        // Delete modal events
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDeleteContact());

        // Close modals when clicking outside
        document.getElementById('contactModal').addEventListener('click', (e) => {
            if (e.target.id === 'contactModal') this.closeContactModal();
        });

        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') this.closeDeleteModal();
        });
    }

    setupMenuListeners() {
        if (window.electronAPI) {
            window.electronAPI.onMenuImportContacts(() => this.importContacts());
            window.electronAPI.onMenuExportContacts(() => this.exportContacts());
        }
    }

    async loadContacts() {
        try {
            const storedContacts = localStorage.getItem('contact-manager-contacts');
            if (storedContacts) {
                this.contacts = JSON.parse(storedContacts);
            }
        } catch (error) {
            console.error('Failed to load contacts:', error);
            this.showToast('Failed to load contacts', 'error');
        }
    }

    async saveContacts() {
        try {
            localStorage.setItem('contact-manager-contacts', JSON.stringify(this.contacts));
        } catch (error) {
            console.error('Failed to save contacts:', error);
            this.showToast('Failed to save contacts', 'error');
        }
    }

    renderContacts() {
        const contactList = document.getElementById('contactList');
        const filteredContacts = this.getFilteredContacts();

        if (filteredContacts.length === 0) {
            contactList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-address-book" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <h3>No contacts found</h3>
                    <p>${this.currentFilters.search || this.currentFilters.isFavorite ? 'Try adjusting your filters' : 'Add your first contact to get started'}</p>
                </div>
            `;
            return;
        }

        contactList.innerHTML = filteredContacts.map(contact => this.createContactCard(contact)).join('');

        // Update contact count
        document.getElementById('contactCount').textContent = `${filteredContacts.length} contact${filteredContacts.length !== 1 ? 's' : ''}`;
    }

    createContactCard(contact) {
        const fullName = `${contact.firstName} ${contact.lastName}`;
        const companyInfo = contact.company ? ` at ${contact.company}` : '';
        const jobInfo = contact.jobTitle ? ` (${contact.jobTitle})` : '';

        return `
            <div class="contact-card ${contact.isFavorite ? 'favorite' : ''}" data-id="${contact.id}">
                <div class="contact-header">
                    <div class="contact-name">${fullName}${companyInfo}${jobInfo}</div>
                    <div class="contact-actions">
                        <button class="action-btn favorite-btn ${contact.isFavorite ? 'active' : ''}"
                                onclick="app.toggleFavorite('${contact.id}')" title="Toggle favorite">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="app.editContact('${contact.id}')" title="Edit contact">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="app.deleteContact('${contact.id}')" title="Delete contact">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="contact-info">
                    <div class="contact-info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${contact.email}</span>
                    </div>
                    <div class="contact-info-item">
                        <i class="fas fa-phone"></i>
                        <span>${contact.phone}</span>
                    </div>
                    ${contact.company ? `
                        <div class="contact-info-item">
                            <i class="fas fa-building"></i>
                            <span>${contact.company}</span>
                        </div>
                    ` : ''}
                    ${contact.address ? `
                        <div class="contact-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${contact.address.city}, ${contact.address.state}</span>
                        </div>
                    ` : ''}
                </div>

                ${contact.tags && contact.tags.length > 0 ? `
                    <div class="contact-tags">
                        ${contact.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getFilteredContacts() {
        let filtered = [...this.contacts];

        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(contact =>
                contact.firstName.toLowerCase().includes(searchTerm) ||
                contact.lastName.toLowerCase().includes(searchTerm) ||
                contact.email.toLowerCase().includes(searchTerm) ||
                contact.phone.includes(searchTerm) ||
                (contact.company && contact.company.toLowerCase().includes(searchTerm))
            );
        }

        // Favorite filter
        if (this.currentFilters.isFavorite) {
            filtered = filtered.filter(contact => contact.isFavorite);
        }

        // Sorting
        filtered.sort((a, b) => {
            let aValue = a[this.currentFilters.sortBy];
            let bValue = b[this.currentFilters.sortBy];

            if (this.currentFilters.sortBy === 'firstName' || this.currentFilters.sortBy === 'lastName') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return this.currentFilters.sortOrder === 'desc' ? 1 : -1;
            if (aValue > bValue) return this.currentFilters.sortOrder === 'desc' ? -1 : 1;
            return 0;
        });

        return filtered;
    }

    updateStats() {
        const stats = {
            total: this.contacts.length,
            favorites: this.contacts.filter(c => c.isFavorite).length,
            withEmail: this.contacts.filter(c => c.email).length,
            withPhone: this.contacts.filter(c => c.phone).length
        };

        document.getElementById('totalContacts').textContent = stats.total;
        document.getElementById('favoriteContacts').textContent = stats.favorites;
        document.getElementById('emailContacts').textContent = stats.withEmail;
        document.getElementById('phoneContacts').textContent = stats.withPhone;
    }

    openContactModal(contactId = null) {
        this.editingContactId = contactId;
        const modal = document.getElementById('contactModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('contactForm');

        if (contactId) {
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact) {
                title.textContent = 'Edit Contact';
                this.populateForm(contact);
            }
        } else {
            title.textContent = 'Add New Contact';
            form.reset();
        }

        modal.classList.add('show');
    }

    closeContactModal() {
        const modal = document.getElementById('contactModal');
        modal.classList.remove('show');
        this.editingContactId = null;
    }

    populateForm(contact) {
        document.getElementById('firstName').value = contact.firstName;
        document.getElementById('lastName').value = contact.lastName;
        document.getElementById('email').value = contact.email;
        document.getElementById('phone').value = contact.phone;
        document.getElementById('company').value = contact.company || '';
        document.getElementById('jobTitle').value = contact.jobTitle || '';
        document.getElementById('tags').value = contact.tags ? contact.tags.join(', ') : '';
        document.getElementById('notes').value = contact.notes || '';

        if (contact.address) {
            document.getElementById('street').value = contact.address.street || '';
            document.getElementById('city').value = contact.address.city || '';
            document.getElementById('state').value = contact.address.state || '';
            document.getElementById('zipCode').value = contact.address.zipCode || '';
            document.getElementById('country').value = contact.address.country || '';
        }
    }

    async handleContactSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const contactData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            company: formData.get('company').trim() || undefined,
            jobTitle: formData.get('jobTitle').trim() || undefined,
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
            notes: formData.get('notes').trim() || undefined
        };

        // Address data
        const street = formData.get('street').trim();
        const city = formData.get('city').trim();
        const state = formData.get('state').trim();
        const zipCode = formData.get('zipCode').trim();
        const country = formData.get('country').trim();

        if (street || city || state || zipCode || country) {
            contactData.address = {
                street: street || undefined,
                city: city || undefined,
                state: state || undefined,
                zipCode: zipCode || undefined,
                country: country || undefined
            };
        }

        // Validation
        if (!contactData.firstName || !contactData.lastName || !contactData.email || !contactData.phone) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            if (this.editingContactId) {
                // Update existing contact
                const index = this.contacts.findIndex(c => c.id === this.editingContactId);
                if (index !== -1) {
                    this.contacts[index] = {
                        ...this.contacts[index],
                        ...contactData,
                        updatedAt: new Date()
                    };
                    this.showToast('Contact updated successfully', 'success');
                }
            } else {
                // Create new contact
                const newContact = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    ...contactData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isFavorite: false
                };
                this.contacts.push(newContact);
                this.showToast('Contact added successfully', 'success');
            }

            await this.saveContacts();
            this.closeContactModal();
            this.renderContacts();
            this.updateStats();
        } catch (error) {
            console.error('Failed to save contact:', error);
            this.showToast('Failed to save contact', 'error');
        }
    }

    async toggleFavorite(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
            contact.isFavorite = !contact.isFavorite;
            contact.updatedAt = new Date();
            await this.saveContacts();
            this.renderContacts();
            this.updateStats();
        }
    }

    editContact(contactId) {
        this.openContactModal(contactId);
    }

    deleteContact(contactId) {
        this.deletingContactId = contactId;
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
            document.getElementById('deleteContactPreview').innerHTML = `
                <strong>${contact.firstName} ${contact.lastName}</strong><br>
                ${contact.email}<br>
                ${contact.phone}
            `;
            document.getElementById('deleteModal').classList.add('show');
        }
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('show');
        this.deletingContactId = null;
    }

    async confirmDeleteContact() {
        if (this.deletingContactId) {
            this.contacts = this.contacts.filter(c => c.id !== this.deletingContactId);
            await this.saveContacts();
            this.renderContacts();
            this.updateStats();
            this.showToast('Contact deleted successfully', 'success');
            this.closeDeleteModal();
        }
    }

    async importContacts() {
        try {
            if (!window.electronAPI) {
                this.showToast('Import not available in browser mode', 'warning');
                return;
            }

            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                const fileResult = await window.electronAPI.readFile(result.filePaths[0]);
                if (fileResult.success) {
                    const importedContacts = JSON.parse(fileResult.data);
                    let imported = 0;

                    for (const contact of importedContacts) {
                        if (contact.id && !this.contacts.find(c => c.id === contact.id)) {
                            this.contacts.push(contact);
                            imported++;
                        }
                    }

                    await this.saveContacts();
                    this.renderContacts();
                    this.updateStats();
                    this.showToast(`Successfully imported ${imported} contacts`, 'success');
                } else {
                    this.showToast('Failed to read file', 'error');
                }
            }
        } catch (error) {
            console.error('Import failed:', error);
            this.showToast('Import failed', 'error');
        }
    }

    async exportContacts() {
        try {
            if (!window.electronAPI) {
                this.showToast('Export not available in browser mode', 'warning');
                return;
            }

            const result = await window.electronAPI.showSaveDialog('contacts.json');
            if (!result.canceled && result.filePath) {
                const data = JSON.stringify(this.contacts, null, 2);
                const writeResult = await window.electronAPI.writeFile(result.filePath, data);

                if (writeResult.success) {
                    this.showToast('Contacts exported successfully', 'success');
                } else {
                    this.showToast('Failed to export contacts', 'error');
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ContactManagerApp();
});
