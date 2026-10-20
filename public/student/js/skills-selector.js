/**
 * CWTSConnect — Student Skills Selector Component
 * Strictly restricts student skill selection to the NSTP Coordinator's official skills masterlist.
 * Loaded from /api/skills.
 */

(function () {
  'use strict';

  let officialSkills = [];
  let selectedSkills = [];
  let isInitialized = false;
  let pendingInitialSkills = null;

  // DOM Elements
  let hiddenInput = null;
  let dropdownEl = null;
  let selectedBoxEl = null;
  let availableChipsEl = null;
  let countBadgeEl = null;

  async function fetchOfficialSkills() {
    try {
      const res = await fetch('/api/skills', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        officialSkills = data.data
          .filter(s => s.is_active !== false)
          .map(s => ({
            id: s.skill_id,
            name: s.name.trim(),
            category: s.category || 'General',
            description: s.description || ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (err) {
      console.error('Error fetching official skills catalog:', err);
    }
  }

  function renderDropdown() {
    if (!dropdownEl) return;
    const currentVal = dropdownEl.value;

    dropdownEl.innerHTML = `
      <option value="">-- Choose an official skill to add --</option>
      ${officialSkills.map(s => {
        const isSelected = selectedSkills.some(sel => sel.toLowerCase() === s.name.toLowerCase());
        return `<option value="${escapeHtml(s.name)}" ${isSelected ? 'disabled' : ''}>
          ${escapeHtml(s.name)} ${isSelected ? '(Already Selected)' : ''}
        </option>`;
      }).join('')}
    `;

    if (currentVal && !selectedSkills.some(sel => sel.toLowerCase() === currentVal.toLowerCase())) {
      dropdownEl.value = currentVal;
    } else {
      dropdownEl.value = '';
    }
  }

  function renderAvailableChips() {
    if (!availableChipsEl) return;

    if (officialSkills.length === 0) {
      availableChipsEl.innerHTML = '<span style="font-size: 0.8125rem; color: var(--text-muted);">No coordinator skills available yet.</span>';
      return;
    }

    availableChipsEl.innerHTML = officialSkills.map(s => {
      const isSelected = selectedSkills.some(sel => sel.toLowerCase() === s.name.toLowerCase());
      return `
        <button type="button" 
          class="skill-tag ${isSelected ? 'selected' : ''}" 
          data-skill="${escapeHtml(s.name)}"
          title="${escapeHtml(s.description || s.name)}"
          onclick="window.toggleStudentSkill('${escapeHtml(s.name)}')">
          ${escapeHtml(s.name)}
        </button>
      `;
    }).join('');
  }

  function renderSelectedSkills() {
    if (!selectedBoxEl) return;

    if (selectedSkills.length === 0) {
      selectedBoxEl.innerHTML = `
        <span class="empty-skills-placeholder">
          No skills selected yet. Click the official skills below to add.
        </span>
      `;
    } else {
      selectedBoxEl.innerHTML = selectedSkills.map(skill => `
        <span class="selected-skill-pill">
          <span>${escapeHtml(skill)}</span>
          <button type="button" class="remove-skill-btn" title="Remove ${escapeHtml(skill)}" onclick="window.removeStudentSkill('${escapeHtml(skill)}')">×</button>
        </span>
      `).join('');
    }

    if (countBadgeEl) {
      countBadgeEl.textContent = `${selectedSkills.length} selected`;
    }

    // Keep hidden input synchronized
    if (hiddenInput) {
      hiddenInput.value = selectedSkills.join(', ');
      // Trigger change event for any validation listeners
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function addSkill(skillName) {
    if (!skillName) return;
    const trimmed = skillName.trim();
    // Validate that it exists in coordinator's catalog
    const matched = officialSkills.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!matched) {
      console.warn(`Skill "${trimmed}" is not part of the coordinator's official skills list.`);
      return;
    }

    const canonicalName = matched.name;
    if (!selectedSkills.some(s => s.toLowerCase() === canonicalName.toLowerCase())) {
      selectedSkills.push(canonicalName);
      renderSelectedSkills();
      renderDropdown();
      renderAvailableChips();
    }
  }

  function removeSkill(skillName) {
    if (!skillName) return;
    const lower = skillName.trim().toLowerCase();
    selectedSkills = selectedSkills.filter(s => s.toLowerCase() !== lower);
    renderSelectedSkills();
    renderDropdown();
    renderAvailableChips();
  }

  function toggleSkill(skillName) {
    if (!skillName) return;
    const lower = skillName.trim().toLowerCase();
    if (selectedSkills.some(s => s.toLowerCase() === lower)) {
      removeSkill(skillName);
    } else {
      addSkill(skillName);
    }
  }

  function setSkills(skillsInput) {
    if (!officialSkills || officialSkills.length === 0) {
      pendingInitialSkills = skillsInput;
      if (hiddenInput && typeof skillsInput === 'string') {
        hiddenInput.value = skillsInput;
      }
      return;
    }

    let list = [];
    if (Array.isArray(skillsInput)) {
      list = skillsInput;
    } else if (typeof skillsInput === 'string' && skillsInput.trim()) {
      list = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
    }

    selectedSkills = [];
    list.forEach(item => {
      const matched = officialSkills.find(s => s.name.toLowerCase() === item.toLowerCase());
      if (matched && !selectedSkills.includes(matched.name)) {
        selectedSkills.push(matched.name);
      }
    });

    renderSelectedSkills();
    renderDropdown();
    renderAvailableChips();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Initialize the Skills Selector
   */
  async function init(options = {}) {
    hiddenInput = document.getElementById(options.inputId || 'skills');
    dropdownEl = document.getElementById(options.dropdownId || 'skillSelectDropdown');
    selectedBoxEl = document.getElementById(options.boxId || 'selectedSkillsBox');
    availableChipsEl = document.getElementById(options.chipsId || 'availableSkillsChips');
    countBadgeEl = document.getElementById(options.countId || 'selectedSkillsCountBadge');

    await fetchOfficialSkills();

    if (dropdownEl) {
      dropdownEl.addEventListener('change', function () {
        if (this.value) {
          addSkill(this.value);
          this.value = '';
        }
      });
    }

    // If pending skills were passed before catalog finished fetching
    if (pendingInitialSkills !== null) {
      setSkills(pendingInitialSkills);
      pendingInitialSkills = null;
    } else if (hiddenInput && hiddenInput.value) {
      setSkills(hiddenInput.value);
    } else if (options.initialSkills) {
      setSkills(options.initialSkills);
    } else {
      renderDropdown();
      renderAvailableChips();
      renderSelectedSkills();
    }

    isInitialized = true;
  }

  // Global window functions
  window.initStudentSkillsSelector = init;
  window.setStudentSkills = setSkills;
  window.addStudentSkill = addSkill;
  window.removeStudentSkill = removeSkill;
  window.toggleStudentSkill = toggleSkill;
  window.appendSkill = addSkill; // Backward compatibility with previous appendSkill helper
  window.getStudentSelectedSkills = () => [...selectedSkills];

  // Auto-initialize if elements are present on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    const hasContainer = document.getElementById('skillsSelectorGroup') ||
      document.getElementById('availableSkillsChips') ||
      document.getElementById('skillSelectDropdown') ||
      document.getElementById('selectedSkillsBox');
    if (hasContainer && !isInitialized) {
      init();
    }
  });
})();
