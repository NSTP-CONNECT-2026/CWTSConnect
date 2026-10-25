// Edit Profile JavaScript with Leaflet Map Integration
document.addEventListener('DOMContentLoaded', function() {
  const profileSkeleton = document.getElementById('profileSkeleton');
  const profileWizardNav = document.getElementById('profileWizardNav');
  const editProfileForm = document.getElementById('editProfileForm');
  const updateBtn = document.getElementById('updateBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const messageContainer = document.getElementById('messageContainer');
  const messageContent = document.getElementById('messageContent');
  const messageText = document.getElementById('messageText');
  const messageClose = document.getElementById('messageClose');

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showLoading() {
    if (profileSkeleton) profileSkeleton.style.display = 'block';
    if (profileWizardNav) profileWizardNav.classList.add('hidden');
    if (editProfileForm) editProfileForm.classList.add('hidden');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }

  function hideLoading() {
    if (profileSkeleton) profileSkeleton.style.display = 'none';
    if (profileWizardNav) profileWizardNav.classList.remove('hidden');
    if (editProfileForm) editProfileForm.classList.remove('hidden');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }

  // Map integration elements
  const locationSearch = document.getElementById('locationSearch');
  const useLocationBtn = document.getElementById('useLocationBtn');
  const searchLocationBtn = document.getElementById('searchLocationBtn');
  const mapContainer = document.getElementById('mapContainer');
  const confirmLocationBtn = document.getElementById('confirmLocationBtn');
  const completeAddressField = document.getElementById('completeAddress');
  const barangayField = document.getElementById('barangay');
  const municipalityField = document.getElementById('municipality');
  const provinceField = document.getElementById('province');
  const latitudeField = document.getElementById('latitude');
  const longitudeField = document.getElementById('longitude');

  // Map variables
  let map;
  let marker;
  let selectedLocation = null;

  function updateSelectedCoordinates(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return;
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) return;

    selectedLocation = { lat: numLat, lng: numLng };

    if (latitudeField) latitudeField.value = numLat.toString();
    if (longitudeField) longitudeField.value = numLng.toString();

    const coordsDisplay = document.getElementById('coordsDisplayVal');
    if (coordsDisplay) {
      coordsDisplay.textContent = `Lat: ${numLat.toFixed(6)}, Lng: ${numLng.toFixed(6)}`;
    }
  }

  // Load existing profile data
  loadProfileData();

  // Initialize map integration
  initializeMapIntegration();

  // Event listeners
  if (editProfileForm) editProfileForm.addEventListener('submit', handleSubmit);
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/student/profile.html';
    });
  }
  if (messageClose) messageClose.addEventListener('click', hideMessage);

  // Auto-hide messages after 5 seconds
  let messageTimeout;

  function initializeMapIntegration() {
    // Initialize Leaflet map
    initializeLeafletMap();
    
    // Use location button
    if (useLocationBtn) useLocationBtn.addEventListener('click', getCurrentLocation);
    
    // Search location button
    if (searchLocationBtn) searchLocationBtn.addEventListener('click', searchLocation);
    
    // Allow searching on Enter key
    const searchInput = document.getElementById('locationSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchLocation();
        }
      });
    }

    // Confirm location button
    if (confirmLocationBtn) confirmLocationBtn.addEventListener('click', confirmSelectedLocation);
  }

  function fixLeafletDefaultIcons() {
    if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });
    }
  }

  function initializeLeafletMap() {
    try {
      fixLeafletDefaultIcons();

      const initialCoords = selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [14.5995, 120.9842];
      const initialZoom = selectedLocation ? 15 : 6;

      // 1. Esri World Street Map (Primary - highly reliable, fast CDN, detailed street and barangay rendering, no 403 blocks)
      const esriStreetLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Street Map',
        maxZoom: 19
      });

      // 2. Esri World Topo Map
      const esriTopoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Topo Map',
        maxZoom: 19
      });

      // 3. Esri World Imagery (Satellite)
      const esriSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Satellite',
        maxZoom: 19
      });

      // Initialize map centered on initial coordinates with Esri Street as default
      map = L.map('map', {
        center: initialCoords,
        zoom: initialZoom,
        layers: [esriStreetLayer],
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Layer switcher control
      L.control.layers({
        'Street Map (Esri)': esriStreetLayer,
        'Topographic (Esri)': esriTopoLayer,
        'Satellite View (Esri)': esriSatLayer
      }, null, { position: 'topright' }).addTo(map);

      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 250);

      // Initialize marker
      marker = L.marker(initialCoords, {
        draggable: true
      }).addTo(map);

      // Listen for marker drag
      marker.on('dragend', onMarkerDragEnd);

      // Listen for map clicks
      map.on('click', onMapClick);

      showLocationStatus('Click on the map or use location buttons to update your address.', 'info');

    } catch (error) {
      console.error('Error initializing map:', error);
      showLocationStatus('Map services unavailable. Please enter address manually.', 'error');
    }
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      showLocationStatus('Geolocation is not supported by this browser.', 'error');
      return;
    }

    useLocationBtn.disabled = true;
    showLocationStatus('Getting your location...', 'loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        updateSelectedCoordinates(lat, lng);
        
        // Update map
        if (map && marker) {
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
        }

        // Reverse geocode to get address
        reverseGeocode(lat, lng);
        
        useLocationBtn.disabled = false;
        showLocationStatus('Location found! Review and confirm your address.', 'success');
      },
      (error) => {
        useLocationBtn.disabled = false;
        let errorMessage = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        showLocationStatus(errorMessage, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  function searchLocation() {
    const searchQuery = locationSearch.value.trim();
    if (!searchQuery) {
      showLocationStatus('Please enter a location to search.', 'error');
      return;
    }

    // Clean up any existing suggestions
    const existingSuggestions = document.querySelector('.location-suggestions');
    if (existingSuggestions) {
      existingSuggestions.remove();
    }

    searchLocationBtn.disabled = true;
    showLocationStatus('Searching for location...', 'loading');

    // Use Nominatim API for geocoding (free OpenStreetMap service)
    // Add more specific search for Philippines
    let q = searchQuery;
    if (!q.toLowerCase().includes('philippines')) {
      q += ', Philippines';
    }
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&countrycodes=ph`;

    fetch(nominatimUrl)
      .then(response => response.json())
      .then(data => {
        searchLocationBtn.disabled = false;
        
        // Remove loading status
        const existingStatus = document.querySelector('.location-status');
        if (existingStatus) {
          existingStatus.remove();
        }

        if (data && data.length > 0) {
          // Deduplicate results based on normalized display_name
          const uniqueResults = [];
          const seen = new Set();
          for (const item of data) {
            const key = (item.display_name || '').trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              uniqueResults.push(item);
            }
          }

          // If multiple results, try to find the best match
          let bestResult = uniqueResults[0];
          
          // Prefer results that have more complete address information
          for (let result of uniqueResults) {
            const addr = result.address || {};
            const hasBarangay = addr.village || addr.suburb || addr.neighbourhood;
            const hasMunicipality = addr.city || addr.town || addr.municipality;
            const hasProvince = addr.state || addr.province;
            
            if (hasBarangay && hasMunicipality && hasProvince) {
              bestResult = result;
              break;
            }
          }
          
          const lat = parseFloat(bestResult.lat);
          const lng = parseFloat(bestResult.lon);
          
          updateSelectedCoordinates(lat, lng);
          
          // Update map
          if (map && marker) {
            map.setView([lat, lng], 15);
            marker.setLatLng([lat, lng]);
          }

          // Parse address from result
          parseNominatimAddress(bestResult);
          
          // Show additional suggestions if we have multiple results
          if (uniqueResults.length > 1) {
            showLocationSuggestions(uniqueResults, bestResult);
          } else {
            showLocationStatus('Location found! Review and confirm the details.', 'success');
          }
        } else {
          showLocationStatus('Location not found. Try searching for a nearby landmark or use a more general location like "Santa Cruz, Laguna".', 'error');
        }
      })
      .catch(error => {
        console.error('Geocoding error:', error);
        searchLocationBtn.disabled = false;
        showLocationStatus('Search failed. Please try again.', 'error');
      });
  }

  function showLocationSuggestions(results, activeResult) {
    // Remove existing suggestions
    const existingSuggestions = document.querySelector('.location-suggestions');
    if (existingSuggestions) {
      existingSuggestions.remove();
    }

    // Remove any loading status
    const existingStatus = document.querySelector('.location-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create suggestions container
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'location-suggestions';
    suggestionsDiv.setAttribute('role', 'region');
    suggestionsDiv.setAttribute('aria-label', 'Location search matches');

    // Header container
    const header = document.createElement('div');
    header.className = 'location-suggestions-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'location-suggestions-header-left';
    headerLeft.innerHTML = `
      <svg class="suggestions-header-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <span class="location-suggestions-title">Multiple locations found</span>
      <span class="location-suggestions-count">${results.length} results</span>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'location-suggestions-close-btn';
    closeBtn.title = 'Dismiss suggestions';
    closeBtn.setAttribute('aria-label', 'Dismiss suggestions');
    closeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.addEventListener('click', () => {
      suggestionsDiv.remove();
    });

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);
    suggestionsDiv.appendChild(header);

    const hint = document.createElement('p');
    hint.className = 'location-suggestions-hint';
    hint.textContent = 'Click to select the specific location that matches your address:';
    suggestionsDiv.appendChild(hint);

    const listContainer = document.createElement('div');
    listContainer.className = 'location-suggestions-list';

    // Add suggestion cards
    results.forEach((result) => {
      const parts = (result.display_name || '').split(',').map(s => s.trim()).filter(Boolean);
      const primaryTitle = parts[0] || 'Location';
      const secondaryDetails = parts.slice(1).join(', ') || 'Philippines';

      const addr = result.address || {};
      const contextTag = addr.city || addr.town || addr.municipality || addr.state || addr.province || (parts.length > 1 ? parts[1] : '');

      const isActive = activeResult && (activeResult.place_id === result.place_id || (activeResult.lat === result.lat && activeResult.lon === result.lon));

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `location-suggestion-card${isActive ? ' is-selected' : ''}`;
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', isActive ? 'true' : 'false');

      card.innerHTML = `
        <div class="location-suggestion-pin">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div class="location-suggestion-details">
          <div class="location-suggestion-primary-row">
            <span class="location-suggestion-primary">${escapeHtml(primaryTitle)}</span>
            ${contextTag && contextTag.toLowerCase() !== primaryTitle.toLowerCase() ? `<span class="location-suggestion-badge">${escapeHtml(contextTag)}</span>` : ''}
            ${isActive ? '<span class="location-current-pill">Current Pin</span>' : ''}
          </div>
          <div class="location-suggestion-secondary">${escapeHtml(secondaryDetails)}</div>
        </div>
        <div class="location-suggestion-action">
          <span class="location-select-btn-pill">${isActive ? 'Selected' : 'Select'}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        updateSelectedCoordinates(lat, lng);
        
        // Update map
        if (map && marker) {
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
        }

        // Parse address from selected result
        parseNominatimAddress(result);

        if (locationSearch) {
          locationSearch.value = result.display_name || primaryTitle;
        }

        // Remove suggestions
        suggestionsDiv.remove();
        showLocationStatus(`Location selected: ${primaryTitle}${contextTag ? ' (' + contextTag + ')' : ''}`, 'success');
      });

      listContainer.appendChild(card);
    });

    suggestionsDiv.appendChild(listContainer);

    // Insert after location search container
    const searchContainer = document.querySelector('.location-search-bar') || document.querySelector('.location-search-container') || document.getElementById('locationSearch');
    if (searchContainer && searchContainer.parentNode) {
      searchContainer.parentNode.insertBefore(suggestionsDiv, searchContainer.nextSibling);
    }
  }

  function onMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    updateSelectedCoordinates(lat, lng);
    
    // Update marker position
    if (marker) marker.setLatLng([lat, lng]);
    
    // Reverse geocode the clicked position
    reverseGeocode(lat, lng);
    showLocationStatus('Location selected! Review the address details.', 'success');
  }

  function onMarkerDragEnd() {
    const position = marker.getLatLng();
    const lat = position.lat;
    const lng = position.lng;
    
    updateSelectedCoordinates(lat, lng);
    
    // Reverse geocode the new position
    reverseGeocode(lat, lng);
    showLocationStatus('Location updated! Review the address details.', 'success');
  }

  function reverseGeocode(lat, lng) {
    // Use Nominatim API for reverse geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;

    fetch(nominatimUrl)
      .then(response => response.json())
      .then(data => {
        if (data && data.address) {
          parseNominatimAddress(data);
          locationSearch.value = data.display_name || '';
        } else {
          showLocationStatus('Unable to get address for this location.', 'error');
        }
      })
      .catch(error => {
        console.error('Reverse geocoding error:', error);
        showLocationStatus('Unable to get address for this location.', 'error');
      });
  }

  function parseNominatimAddress(data) {
    const address = data.address || {};
    
    // Philippine-specific address parsing
    // OpenStreetMap uses different tags for Philippine locations
    
    // Extract address components with Philippine-specific mapping
    const houseNumber = address.house_number || '';
    const road = address.road || address.street || address.way || '';
    
    // For barangay - try multiple possible fields
    const barangay = address.village || 
                    address.suburb || 
                    address.neighbourhood || 
                    address.hamlet || 
                    address.city_district ||
                    address.quarter || '';
    
    // For municipality - try multiple possible fields
    const municipality = address.city || 
                        address.town || 
                        address.municipality || 
                        address.county || '';
    
    // For province - try multiple possible fields  
    const province = address.state || 
                    address.province || 
                    address.region || '';

    // Build complete address with better logic
    let completeAddress = '';
    const addressParts = [];
    
    if (houseNumber) addressParts.push(houseNumber);
    if (road) addressParts.push(road);
    
    // If no specific street info, use the most specific location available
    if (addressParts.length === 0) {
      if (barangay) addressParts.push(barangay);
      else if (address.amenity) addressParts.push(address.amenity);
      else if (address.building) addressParts.push(address.building);
    }
    
    completeAddress = addressParts.join(' ');

    // Update form fields
    completeAddressField.value = completeAddress;
    barangayField.value = barangay;
    municipalityField.value = municipality;
    provinceField.value = province;
    
    // Store coordinates
    if (selectedLocation) {
      updateSelectedCoordinates(selectedLocation.lat, selectedLocation.lng);
    }

    // Show a warning if important fields are missing
    const missingFields = [];
    if (!barangay) missingFields.push('Barangay');
    if (!municipality) missingFields.push('Municipality');
    if (!province) missingFields.push('Province');
    
    if (missingFields.length > 0) {
      showLocationStatus(`Address found, but please manually fill in: ${missingFields.join(', ')}`, 'warning');
    }
  }

  function confirmSelectedLocation() {
    if (!selectedLocation && marker && marker.getLatLng()) {
      const pos = marker.getLatLng();
      updateSelectedCoordinates(pos.lat, pos.lng);
    }

    if (!selectedLocation) {
      showLocationStatus('Please select a location first.', 'error');
      return;
    }

    updateSelectedCoordinates(selectedLocation.lat, selectedLocation.lng);

    // Validate that required fields are filled
    if (!barangayField.value || !municipalityField.value || !provinceField.value) {
      showLocationStatus('Please ensure all location fields are filled.', 'error');
      return;
    }

    showLocationStatus('Location confirmed! Coordinates recorded.', 'success');
  }

  function showLocationStatus(message, type) {
    // Remove existing status
    const existingStatus = document.querySelector('.location-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    if (!message) return;

    // Create status element
    const statusDiv = document.createElement('div');
    statusDiv.className = `location-status ${type || 'info'}`;

    let iconHtml = '';
    if (type === 'loading') {
      iconHtml = '<span class="status-spinner"></span>';
    } else if (type === 'success') {
      iconHtml = '<span class="location-status-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>';
    } else if (type === 'error') {
      iconHtml = '<span class="location-status-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>';
    } else if (type === 'warning') {
      iconHtml = '<span class="location-status-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span>';
    }

    statusDiv.innerHTML = `${iconHtml}<span>${escapeHtml(message)}</span>`;

    // Insert after location search container
    const searchContainer = document.querySelector('.location-search-bar') || document.querySelector('.location-search-container') || document.getElementById('locationSearch');
    if (searchContainer && searchContainer.parentNode) {
      searchContainer.parentNode.insertBefore(statusDiv, searchContainer.nextSibling);
    }

    // Auto-remove success/error messages after 5 seconds
    if (type !== 'loading') {
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.remove();
        }
      }, 5000);
    }
  }

  async function loadProfileData() {
    showLoading();

    try {
      const response = await fetch('/api/student/profile', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const data = await response.json();

      if (response.ok && data.success && data.data && data.data.profile) {
        populateForm(data.data.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showMessage('Unable to load profile data.', 'error');
    } finally {
      hideLoading();
    }
  }

  function populateForm(profile) {
    if (!profile) return;

    // Personal Information
    const fullNameEl = document.getElementById('fullName');
    if (fullNameEl) fullNameEl.value = profile.full_name || '';

    const studentNumberEl = document.getElementById('studentNumber');
    if (studentNumberEl) studentNumberEl.value = profile.student_number || '';

    const contactNumberEl = document.getElementById('contactNumber');
    if (contactNumberEl) contactNumberEl.value = profile.contact_number || '';

    const birthdateEl = document.getElementById('birthdate');
    if (birthdateEl) {
      birthdateEl.value = profile.birthdate ? profile.birthdate.split('T')[0] : '';
    }

    const sexEl = document.getElementById('sex');
    if (sexEl) sexEl.value = profile.sex || '';

    // Academic Information
    const courseEl = document.getElementById('course');
    if (courseEl) courseEl.value = profile.course || '';

    const yearLevelEl = document.getElementById('yearLevel');
    if (yearLevelEl) yearLevelEl.value = profile.year_level || '';

    const sectionEl = document.getElementById('section');
    if (sectionEl) sectionEl.value = profile.section || '';

    const nstpCompEl = document.getElementById('nstpComponent');
    if (nstpCompEl) nstpCompEl.value = profile.nstp_component || 'CWTS';

    // Location Information
    const completeAddressEl = document.getElementById('completeAddress');
    if (completeAddressEl) completeAddressEl.value = profile.complete_address || profile.address || '';

    const barangayEl = document.getElementById('barangay');
    if (barangayEl) barangayEl.value = profile.barangay || '';

    const municipalityEl = document.getElementById('municipality');
    if (municipalityEl) municipalityEl.value = profile.municipality || '';

    const provinceEl = document.getElementById('province');
    if (provinceEl) provinceEl.value = profile.province || '';

    // Coordinates (support latitude/longitude or fallback location column)
    let lat = profile.latitude;
    let lng = profile.longitude;
    if ((!lat || !lng) && profile.location && typeof profile.location === 'string' && profile.location.includes(',')) {
      const parts = profile.location.split(',');
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parseFloat(parts[0].trim());
        lng = parseFloat(parts[1].trim());
      }
    }

    if (lat && lng) {
      updateSelectedCoordinates(lat, lng);
      
      // Show existing location on map
      if (map && marker) {
        map.setView([selectedLocation.lat, selectedLocation.lng], 15);
        marker.setLatLng([selectedLocation.lat, selectedLocation.lng]);
        showLocationStatus('Loaded location pinned on map.', 'info');
      }
    }

    // Skills
    const skillsEl = document.getElementById('skills');
    if (skillsEl) skillsEl.value = profile.skills || '';
    if (window.setStudentSkills) {
      window.setStudentSkills(profile.skills || '');
    }

    // Emergency Contact
    const emergencyNameEl = document.getElementById('emergencyContactName');
    if (emergencyNameEl) emergencyNameEl.value = profile.emergency_contact_name || '';

    const emergencyNumEl = document.getElementById('emergencyContactNumber');
    if (emergencyNumEl) emergencyNumEl.value = profile.emergency_contact_number || '';

    const emergencyRelEl = document.getElementById('emergencyContactRelationship');
    if (emergencyRelEl) emergencyRelEl.value = profile.emergency_contact_relationship || '';
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // 1. Sync coordinates from selectedLocation, marker, or inputs
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      updateSelectedCoordinates(selectedLocation.lat, selectedLocation.lng);
    } else if (marker && marker.getLatLng()) {
      const pos = marker.getLatLng();
      updateSelectedCoordinates(pos.lat, pos.lng);
    } else if (latitudeField && latitudeField.value && longitudeField && longitudeField.value) {
      updateSelectedCoordinates(latitudeField.value, longitudeField.value);
    }

    // 2. Validate Step 1
    if (!validateStep(1)) {
      goToStep(1);
      return;
    }

    // 3. Validate Step 2
    if (!validateStep(2)) {
      goToStep(2);
      return;
    }

    // Check that coordinates are present
    if (!latitudeField || !latitudeField.value || !longitudeField || !longitudeField.value) {
      goToStep(2);
      showMessage('Please pin your location on the map.', 'error');
      return;
    }

    // 4. Validate Step 3: Skills required
    const skillsInput = document.getElementById('skills');
    if (!skillsInput || !skillsInput.value.trim()) {
      goToStep(3);
      const dropdown = document.getElementById('skillSelectDropdown');
      if (dropdown) {
        dropdown.classList.add('invalid');
        dropdown.focus();
      } else {
        const group = document.getElementById('skillsSelectorGroup');
        if (group) group.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showMessage('Please select at least one skill.', 'error');
      return;
    }

    // 5. Validate Contact Numbers
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    const contactInput = document.getElementById('contactNumber');
    const cleanContact = contactInput?.value ? contactInput.value.replace(/[\s\-()]/g, '') : '';
    if (!phoneRegex.test(cleanContact)) {
      goToStep(1);
      if (contactInput) {
        contactInput.classList.add('invalid');
        contactInput.focus();
      }
      showMessage('Invalid contact number (e.g. 09XXXXXXXXX).', 'error');
      return;
    }

    const emergencyNumInput = document.getElementById('emergencyContactNumber');
    if (emergencyNumInput && emergencyNumInput.value.trim()) {
      const cleanEmergency = emergencyNumInput.value.replace(/[\s\-()]/g, '');
      if (!phoneRegex.test(cleanEmergency)) {
        goToStep(3);
        emergencyNumInput.classList.add('invalid');
        emergencyNumInput.focus();
        showMessage('Invalid emergency contact number.', 'error');
        return;
      }
    }

    // Disable submit button with inline saving indicator
    const originalBtnText = updateBtn.innerHTML;
    updateBtn.disabled = true;
    updateBtn.innerHTML = `
      <svg style="display:inline-block;width:16px;height:16px;margin-right:6px;vertical-align:middle;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Saving Profile...</span>
    `;

    try {
      // Collect form data
      const formData = new FormData(editProfileForm);
      const profileData = {};
      
      for (let [key, value] of formData.entries()) {
        profileData[key] = value.trim();
      }

      // Format coordinates
      profileData.latitude = latitudeField.value;
      profileData.longitude = longitudeField.value;
      profileData.location = `${latitudeField.value},${longitudeField.value}`;

      // Handle optional fields
      if (!profileData.birthdate) profileData.birthdate = null;
      if (!profileData.sex) profileData.sex = null;
      if (!profileData.emergency_contact_name) profileData.emergency_contact_name = null;
      if (!profileData.emergency_contact_number) profileData.emergency_contact_number = null;
      if (!profileData.emergency_contact_relationship) profileData.emergency_contact_relationship = null;
      profileData.nstp_component = 'CWTS';

      // Update profile
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('Profile updated successfully! Redirecting...', 'success');
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalBtnText;

        // Update header user name & initials in topbar / sidebar if changed
        const firstName = profileData.first_name || '';
        const lastName = profileData.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarUserName && fullName) sidebarUserName.textContent = fullName;
        if (sidebarAvatar && firstName) {
          sidebarAvatar.textContent = (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase();
        }

        setTimeout(() => {
          window.location.href = '/student/profile.html';
        }, 1200);
      } else {
        showMessage(data.message || 'Save failed. Please try again.', 'error');
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalBtnText;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('Network error. Please try again.', 'error');
      updateBtn.disabled = false;
      updateBtn.innerHTML = originalBtnText;
    }
  }

  function showMessage(message, type = 'info') {
    if (window.showStudentToast) {
      window.showStudentToast(message, type);
      return;
    }

    messageText.textContent = message;
    messageContent.className = `message-content ${type}`;
    messageContainer.classList.remove('toast-hiding');
    messageContainer.classList.add('toast-active');
    messageContainer.style.display = 'block';

    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    messageTimeout = setTimeout(hideMessage, 3800);
  }

  function hideMessage() {
    if (window.hideStudentToast) {
      window.hideStudentToast();
      return;
    }
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
    messageContainer.classList.remove('toast-active');
    messageContainer.classList.add('toast-hiding');
    setTimeout(() => {
      if (messageContainer.classList.contains('toast-hiding')) {
        messageContainer.style.display = 'none';
        messageContainer.classList.remove('toast-hiding');
      }
    }, 220);
  }

  // Form validation helpers
  function validateForm() {
    const requiredFields = [
      'full_name', 'student_number', 'course', 'year_level', 
      'section', 'nstp_component', 'contact_number', 
      'complete_address', 'barangay', 'municipality', 'province', 'skills'
    ];

    for (let field of requiredFields) {
      const input = editProfileForm.querySelector(`[name="${field}"]`);
      if (!input || !input.value.trim()) {
        return false;
      }
    }

    return true;
  }

  // Real-time validation feedback
  const inputs = editProfileForm.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      validateField(this);
    });
  });

  function validateField(field) {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');

    // Remove existing validation classes
    field.classList.remove('valid', 'invalid');

    if (isRequired && !value) {
      field.classList.add('invalid');
      return false;
    }

    // Specific validations
    if (field.name === 'contact_number' && value) {
      const phoneRegex = /^(\+63|0)[0-9]{10}$/;
      if (!phoneRegex.test(value.replace(/\s+/g, ''))) {
        field.classList.add('invalid');
        return false;
      }
    }

    if (field.name === 'emergency_contact_number' && value) {
      const phoneRegex = /^(\+63|0)[0-9]{10}$/;
      if (!phoneRegex.test(value.replace(/\s+/g, ''))) {
        field.classList.add('invalid');
        return false;
      }
    }

    if (field.name === 'student_number' && value) {
      if (value.length < 5) {
        field.classList.add('invalid');
        return false;
      }
    }

    if (value || isRequired) {
      field.classList.add('valid');
    }

    return true;
  }

  // ==========================================
  // WIZARD STEP PAGINATION LOGIC
  // ==========================================
  let currentStep = 1;
  const totalSteps = 3;

  function goToStep(targetStep) {
    if (targetStep < 1 || targetStep > totalSteps) return;

    // Validate current step before advancing
    if (targetStep > currentStep) {
      if (!validateStep(currentStep)) {
        return;
      }
    }

    currentStep = targetStep;

    // Toggle Panels & Nav Tabs
    for (let i = 1; i <= totalSteps; i++) {
      const panel = document.getElementById(`stepPanel${i}`);
      const tab = document.getElementById(`tabStep${i}`);
      
      if (panel) {
        panel.classList.toggle('active', i === currentStep);
      }
      if (tab) {
        tab.classList.toggle('active', i === currentStep);
        tab.classList.toggle('completed', i < currentStep);
        tab.setAttribute('aria-selected', i === currentStep ? 'true' : 'false');
      }
    }

    // Invalidate Leaflet Map Size so it immediately renders clearly on Step 2
    if (currentStep === 2 && map) {
      setTimeout(() => {
        map.invalidateSize();
        if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
          map.setView([selectedLocation.lat, selectedLocation.lng], 15);
          if (marker) marker.setLatLng([selectedLocation.lat, selectedLocation.lng]);
        }
      }, 150);
    }
  }

  function validateStep(step) {
    let isValid = true;
    let firstInvalid = null;

    if (step === 1) {
      const step1Fields = ['full_name', 'student_number', 'contact_number', 'course', 'year_level', 'section', 'nstp_component'];
      for (let fieldName of step1Fields) {
        const input = editProfileForm.querySelector(`[name="${fieldName}"]`);
        if (input && (!input.value || !input.value.trim())) {
          input.classList.add('invalid');
          if (!firstInvalid) firstInvalid = input;
          isValid = false;
        }
      }
      if (!isValid) {
        showMessage('Please complete required student fields.', 'error');
      }
    } else if (step === 2) {
      const step2Fields = ['complete_address', 'barangay', 'municipality', 'province'];
      for (let fieldName of step2Fields) {
        const input = editProfileForm.querySelector(`[name="${fieldName}"]`);
        if (input && (!input.value || !input.value.trim())) {
          input.classList.add('invalid');
          if (!firstInvalid) firstInvalid = input;
          isValid = false;
        }
      }

      // Check coordinates
      let hasCoords = (selectedLocation && selectedLocation.lat && selectedLocation.lng) ||
                      (latitudeField && latitudeField.value && longitudeField && longitudeField.value);
      if (!hasCoords && marker && marker.getLatLng()) {
        const pos = marker.getLatLng();
        updateSelectedCoordinates(pos.lat, pos.lng);
        hasCoords = true;
      }
      if (!hasCoords) {
        isValid = false;
        showMessage('Please pin your location on the map.', 'error');
      } else if (!isValid) {
        showMessage('Please complete location details.', 'error');
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
    }
    return isValid;
  }

  // Hook up step buttons
  const btnNextStep1 = document.getElementById('btnNextStep1');
  const btnNextStep2 = document.getElementById('btnNextStep2');
  const btnPrevStep2 = document.getElementById('btnPrevStep2');
  const btnPrevStep3 = document.getElementById('btnPrevStep3');

  if (btnNextStep1) btnNextStep1.addEventListener('click', () => goToStep(2));
  if (btnNextStep2) btnNextStep2.addEventListener('click', () => goToStep(3));
  if (btnPrevStep2) btnPrevStep2.addEventListener('click', () => goToStep(1));
  if (btnPrevStep3) btnPrevStep3.addEventListener('click', () => goToStep(2));

  // Hook up top step tab clicks
  document.querySelectorAll('.wizard-step-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const step = parseInt(this.getAttribute('data-step'), 10);
      if (step) goToStep(step);
    });
  });
});