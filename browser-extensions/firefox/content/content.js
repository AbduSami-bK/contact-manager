/**
 * Firefox Contact Manager Content Script
 * Provides contact extraction and context menu functionality
 */

class FirefoxContactContent {
  constructor() {
    this.initializeContentScript();
  }

  initializeContentScript() {
    // Listen for messages from the background script
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Add context menu for contact extraction
    this.setupContextMenu();

    // Add contact extraction button to email fields
    this.addContactExtractionButtons();

    console.log('Firefox Contact Manager content script loaded');
  }

  setupContextMenu() {
    // Create context menu for contact extraction
    const menuId = 'contact-manager-extract';

    // Remove existing menu if it exists
    browser.contextMenus.remove(menuId).catch(() => {});

    // Create new context menu
    browser.contextMenus.create({
      id: menuId,
      title: 'Extract Contact Info',
      contexts: ['selection', 'link']
    });

    // Handle context menu clicks
    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === menuId) {
        this.extractContactFromSelection(info.selectionText, tab);
      }
    });
  }

  addContactExtractionButtons() {
    // Add extraction buttons to email input fields
    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');

    emailInputs.forEach(input => {
      if (!input.dataset.contactManagerEnhanced) {
        input.dataset.contactManagerEnhanced = 'true';

        // Create extraction button
        const extractBtn = document.createElement('button');
        extractBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
        extractBtn.title = 'Extract contact info';
        extractBtn.className = 'contact-manager-extract-btn';
        extractBtn.style.cssText = `
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          background: #667eea;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 1000;
        `;

        // Position the input container
        const container = input.parentElement;
        if (container.style.position !== 'absolute' && container.style.position !== 'relative') {
          container.style.position = 'relative';
        }

        // Add button to container
        container.appendChild(extractBtn);

        // Show/hide button on focus/blur
        input.addEventListener('focus', () => {
          extractBtn.style.opacity = '1';
        });

        input.addEventListener('blur', () => {
          setTimeout(() => {
            extractBtn.style.opacity = '0';
          }, 200);
        });

        // Handle button click
        extractBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.extractContactFromEmail(input.value);
        });
      }
    });
  }

  async extractContactFromSelection(selectedText, tab) {
    try {
      // Parse the selected text for contact information
      const contactInfo = this.parseContactText(selectedText);

      if (contactInfo) {
        // Send to background script to save
        const response = await browser.runtime.sendMessage({
          action: 'saveContact',
          data: contactInfo
        });

        if (response.success) {
          this.showNotification('Contact extracted and saved successfully!', 'success');
        } else {
          this.showNotification('Failed to save contact', 'error');
        }
      } else {
        this.showNotification('No valid contact information found in selection', 'info');
      }
    } catch (error) {
      console.error('Failed to extract contact:', error);
      this.showNotification('Failed to extract contact information', 'error');
    }
  }

  async extractContactFromEmail(email) {
    if (!email || !this.isValidEmail(email)) {
      this.showNotification('Please enter a valid email address', 'error');
      return;
    }

    try {
      // Try to extract additional information from the page
      const contactInfo = await this.extractContactFromPage(email);

      // Send to background script to save
      const response = await browser.runtime.sendMessage({
        action: 'saveContact',
        data: contactInfo
      });

      if (response.success) {
        this.showNotification('Contact extracted and saved successfully!', 'success');
      } else {
        this.showNotification('Failed to save contact', 'error');
      }
    } catch (error) {
      console.error('Failed to extract contact from email:', error);
      this.showNotification('Failed to extract contact information', 'error');
    }
  }

  parseContactText(text) {
    if (!text || text.trim().length === 0) return null;

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const contactInfo = {};

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      contactInfo.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0];
    }

    // Extract name (look for patterns like "John Doe" or "Doe, John")
    const namePatterns = [
      /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/, // John Doe
      /^([A-Z][a-z]+),\s*([A-Z][a-z]+)$/, // Doe, John
      /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/ // John Michael Doe
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 3) {
          contactInfo.firstName = match[1];
          contactInfo.lastName = match[2];
        } else if (match.length === 4) {
          contactInfo.firstName = `${match[1]} ${match[2]}`;
          contactInfo.lastName = match[3];
        }
        break;
      }
    }

    // Extract company (look for common company indicators)
    const companyPatterns = [
      /(?:at|@|Company:?\s*)([A-Z][A-Za-z0-9\s&]+?)(?:\s|$|,|\.)/i,
      /(?:Works at|Employed by|Company:?\s*)([A-Z][A-Za-z0-9\s&]+?)(?:\s|$|,|\.)/i
    ];

    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        contactInfo.company = match[1].trim();
        break;
      }
    }

    // If we have at least an email or name, return the contact info
    if (contactInfo.email || (contactInfo.firstName && contactInfo.lastName)) {
      return {
        firstName: contactInfo.firstName || 'Unknown',
        lastName: contactInfo.lastName || 'Contact',
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        company: contactInfo.company || '',
        tags: ['extracted'],
        notes: `Extracted from: ${window.location.href}`
      };
    }

    return null;
  }

  async extractContactFromPage(email) {
    const contactInfo = {
      firstName: 'Unknown',
      lastName: 'Contact',
      email: email,
      phone: '',
      company: '',
      tags: ['extracted'],
      notes: `Extracted from: ${window.location.href}`
    };

    // Try to find name in the page
    const nameSelectors = [
      'h1', 'h2', 'h3', '.name', '.author', '.user-name', '[data-name]',
      'meta[name="author"]', 'meta[property="og:title"]'
    ];

    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const nameMatch = text.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
        if (nameMatch) {
          contactInfo.firstName = nameMatch[1];
          contactInfo.lastName = nameMatch[2];
          break;
        }
      }
    }

    // Try to find company information
    const companySelectors = [
      '.company', '.organization', '.employer', '[data-company]',
      'meta[name="organization"]', 'meta[property="og:site_name"]'
    ];

    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text && text.length > 0 && text.length < 100) {
          contactInfo.company = text;
          break;
        }
      }
    }

    // Try to find phone number
    const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const pageText = document.body.textContent;
    const phoneMatch = pageText.match(phonePattern);
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0];
    }

    return contactInfo;
  }

  isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `contact-manager-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'extractContact':
        this.extractContactFromSelection(request.text, sender.tab);
        sendResponse({ success: true });
        break;
      case 'getPageInfo':
        const pageInfo = {
          url: window.location.href,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || ''
        };
        sendResponse({ success: true, data: pageInfo });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }
}

// Initialize the content script
new FirefoxContactContent();
