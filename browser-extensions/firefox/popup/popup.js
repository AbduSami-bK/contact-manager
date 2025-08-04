/**
 * Firefox Contact Manager Popup Script
 * Handles all popup interactions and UI logic
 */

class FirefoxContactPopup {
  constructor() {
    this.contacts = [];
    this.filteredContacts = [];
    this.editingContactId = null;
    this.searchQuery = '';

    this.initializeElements();
    this.setupEventListeners();
    this.loadContacts();
  }

  initializeElements() {
    // Main elements
    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearch');
    this.contactList = document.getElementById('contactList');
    this.noContactsDiv = document.getElementById('noContacts');

    // Stats elements
    this.totalContactsEl = document.getElementById('totalContacts');
    this.favoriteContactsEl = document.getElementById('favoriteContacts');
    this.recentContactsEl = document.getElementById('recentContacts');

    // Buttons
    this.addContactBtn = document.getElementById('addContactBtn');
    this.addFirstContactBtn = document.getElementById('addFirstContact');
    this.importBtn = document.getElementById('importBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.openFullViewBtn = document.getElementById('openFullView');

    // Modal elements
    this.contactModal = document.getElementById('contactModal');
    this.importModal = document.getElementById('importModal');
    this.contactForm = document.getElementById('contactForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.closeModalBtn = document.getElementById('closeModal');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.saveBtn = document.getElementById('saveBtn');

    // Import modal elements
    this.closeImportModalBtn = document.getElementById('closeImportModal');
    this.cancelImportBtn = document.getElementById('cancelImportBtn');
    this.importDataBtn = document.getElementById('importDataBtn');
    this.importDataTextarea = document.getElementById('importData');

    // Toast container
    this.toastContainer = document.getElementById('toastContainer');
  }

  setupEventListeners() {
    // Search functionality
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.handleSearch();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.handleSearch();
    });

    // Add contact buttons
    this.addContactBtn.addEventListener('click', () => {
      this.openContactModal();
    });

    this.addFirstContactBtn.addEventListener('click', () => {
      this.openContactModal();
    });

    // Footer buttons
    this.importBtn.addEventListener('click', () => {
      this.openImportModal();
    });

    this.exportBtn.addEventListener('click', () => {
      this.exportContacts();
    });

    this.settingsBtn.addEventListener('click', () => {
      this.showToast('Settings feature coming soon!', 'info');
    });

    this.openFullViewBtn.addEventListener('click', () => {
      this.openFullView();
    });

    // Modal events
    this.closeModalBtn.addEventListener('click', () => {
      this.closeContactModal();
    });

    this.cancelBtn.addEventListener('click', () => {
      this.closeContactModal();
    });

    this.contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleContactSubmit();
    });

    // Import modal events
    this.closeImportModalBtn.addEventListener('click', () => {
      this.closeImportModal();
    });

    this.cancelImportBtn.addEventListener('click', () => {
      this.closeImportModal();
    });

    this.importDataBtn.addEventListener('click', () => {
      this.handleImport();
    });

    // Close modals on outside click
    this.contactModal.addEventListener('click', (e) => {
      if (e.target === this.contactModal) {
        this.closeContactModal();
      }
    });

    this.importModal.addEventListener('click', (e) => {
      if (e.target === this.importModal) {
        this.closeImportModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeContactModal();
        this.closeImportModal();
      }
    });
  }

  async loadContacts() {
    try {
      const response = await this.sendMessage({ action: 'getContacts' });
      if (response.success) {
        this.contacts = response.data;
        this.filteredContacts = [...this.contacts];
        this.renderContacts();
        this.updateStats();
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      this.showToast('Failed to load contacts', 'error');
    }
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage(message)
        .then(response => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Unknown error'));
          }
        })
        .catch(reject);
    });
  }

  handleSearch() {
    if (this.searchQuery.trim() === '') {
      this.filteredContacts = [...this.contacts];
      this.clearSearchBtn.style.display = 'none';
    } else {
      this.filteredContacts = this.contacts.filter(contact =>
        contact.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        contact.phone.includes(this.searchQuery) ||
        (contact.company && contact.company.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        contact.tags.some(tag => tag.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );
      this.clearSearchBtn.style.display = 'block';
    }

    this.renderContacts();
  }

  renderContacts() {
    if (this.filteredContacts.length === 0) {
      this.contactList.style.display = 'none';
      this.noContactsDiv.style.display = 'block';
      return;
    }

    this.contactList.style.display = 'block';
    this.noContactsDiv.style.display = 'none';

    // Sort contacts: favorites first, then by name
    const sortedContacts = [...this.filteredContacts].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    this.contactList.innerHTML = sortedContacts.map(contact => this.createContactItem(contact)).join('');

    // Add event listeners to contact items
    this.contactList.querySelectorAll('.contact-item').forEach((item, index) => {
      const contact = sortedContacts[index];

      item.addEventListener('click', () => {
        this.openContactModal(contact.id);
      });

      // Favorite button
      const favoriteBtn = item.querySelector('.favorite-btn');
      if (favoriteBtn) {
        favoriteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFavorite(contact.id);
        });
      }

      // Edit button
      const editBtn = item.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openContactModal(contact.id);
        });
      }

      // Delete button
      const deleteBtn = item.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteContact(contact.id);
        });
      }
    });
  }

  createContactItem(contact) {
    const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();
    const fullName = `${contact.firstName} ${contact.lastName}`;
    const details = [contact.email, contact.phone, contact.company].filter(Boolean).join(' • ');
    const tags = contact.tags.length > 0 ? contact.tags.slice(0, 2).join(', ') : '';

    return `
      <div class="contact-item ${contact.isFavorite ? 'favorite' : ''}" data-id="${contact.id}">
        <div class="contact-avatar">${initials}</div>
        <div class="contact-info">
          <div class="contact-name">${fullName}</div>
          <div class="contact-details">
            ${details}
            ${tags ? `<br><small style="color: #667eea;">${tags}</small>` : ''}
          </div>
        </div>
        <div class="contact-actions">
          <button class="action-btn favorite-btn ${contact.isFavorite ? 'favorite' : ''}" title="${contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            <i class="fas fa-star"></i>
          </button>
          <button class="action-btn edit-btn" title="Edit contact">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete-btn" title="Delete contact">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  updateStats() {
    const total = this.contacts.length;
    const favorites = this.contacts.filter(c => c.isFavorite).length;
    const recent = this.contacts.filter(c => {
      const created = new Date(c.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created > weekAgo;
    }).length;

    this.totalContactsEl.textContent = total;
    this.favoriteContactsEl.textContent = favorites;
    this.recentContactsEl.textContent = recent;
  }

  openContactModal(contactId = null) {
    this.editingContactId = contactId;
    this.modalTitle.textContent = contactId ? 'Edit Contact' : 'Add Contact';

    if (contactId) {
      const contact = this.contacts.find(c => c.id === contactId);
      if (contact) {
        this.populateForm(contact);
      }
    } else {
      this.contactForm.reset();
    }

    this.contactModal.classList.add('show');
  }

  closeContactModal() {
    this.contactModal.classList.remove('show');
    this.editingContactId = null;
    this.contactForm.reset();
  }

  populateForm(contact) {
    const form = this.contactForm;
    form.firstName.value = contact.firstName;
    form.lastName.value = contact.lastName;
    form.email.value = contact.email || '';
    form.phone.value = contact.phone || '';
    form.company.value = contact.company || '';
    form.jobTitle.value = contact.jobTitle || '';
    form.street.value = contact.address?.street || '';
    form.city.value = contact.address?.city || '';
    form.state.value = contact.address?.state || '';
    form.zipCode.value = contact.address?.zipCode || '';
    form.country.value = contact.address?.country || '';
    form.tags.value = contact.tags.join(', ');
    form.notes.value = contact.notes || '';
  }

  async handleContactSubmit() {
    const formData = new FormData(this.contactForm);
    const contactData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      company: formData.get('company'),
      jobTitle: formData.get('jobTitle'),
      address: {
        street: formData.get('street'),
        city: formData.get('city'),
        state: formData.get('state'),
        zipCode: formData.get('zipCode'),
        country: formData.get('country')
      },
      tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(Boolean),
      notes: formData.get('notes')
    };

    try {
      let response;
      if (this.editingContactId) {
        response = await this.sendMessage({
          action: 'updateContact',
          id: this.editingContactId,
          data: contactData
        });
        this.showToast('Contact updated successfully', 'success');
      } else {
        response = await this.sendMessage({
          action: 'saveContact',
          data: contactData
        });
        this.showToast('Contact added successfully', 'success');
      }

      if (response.success) {
        await this.loadContacts();
        this.closeContactModal();
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      this.showToast('Failed to save contact', 'error');
    }
  }

  async toggleFavorite(contactId) {
    try {
      const response = await this.sendMessage({
        action: 'toggleFavorite',
        id: contactId
      });

      if (response.success) {
        await this.loadContacts();
        const contact = response.data;
        this.showToast(
          contact.isFavorite ? 'Added to favorites' : 'Removed from favorites',
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      this.showToast('Failed to update favorite status', 'error');
    }
  }

  async deleteContact(contactId) {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const response = await this.sendMessage({
        action: 'deleteContact',
        id: contactId
      });

      if (response.success) {
        await this.loadContacts();
        this.showToast('Contact deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      this.showToast('Failed to delete contact', 'error');
    }
  }

  async exportContacts() {
    try {
      const response = await this.sendMessage({ action: 'exportContacts' });

      if (response.success) {
        const dataStr = response.data;
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Contacts exported successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to export contacts:', error);
      this.showToast('Failed to export contacts', 'error');
    }
  }

  openImportModal() {
    this.importModal.classList.add('show');
    this.importDataTextarea.focus();
  }

  closeImportModal() {
    this.importModal.classList.remove('show');
    this.importDataTextarea.value = '';
  }

  async handleImport() {
    const jsonData = this.importDataTextarea.value.trim();

    if (!jsonData) {
      this.showToast('Please enter contact data to import', 'error');
      return;
    }

    try {
      const response = await this.sendMessage({
        action: 'importContacts',
        data: jsonData
      });

      if (response.success) {
        const imported = response.data;
        await this.loadContacts();
        this.closeImportModal();
        this.showToast(`Successfully imported ${imported} contacts`, 'success');
      }
    } catch (error) {
      console.error('Failed to import contacts:', error);
      this.showToast('Failed to import contacts. Please check the data format.', 'error');
    }
  }

  openFullView() {
    // Open a new tab with the full contact manager interface
    browser.tabs.create({
      url: browser.runtime.getURL('popup/popup.html')
    });
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' :
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FirefoxContactPopup();
});
