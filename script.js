document.addEventListener("DOMContentLoaded", () => {
  const htmlElement = document.documentElement;
  const themeToggleBtn = document.getElementById("theme-toggle-btn"),
    sunIcon = document.getElementById("sun-icon"),
    moonIcon = document.getElementById("moon-icon");
  const settingsBtn = document.getElementById("settings-btn"),
    settingsModal = document.getElementById("settings-modal");
  const profileBtn = document.getElementById("profile-btn");
  const notesBtn = document.getElementById("notes-btn");
  const lightPalettesContainer = document.getElementById("light-palettes"),
    darkPalettesContainer = document.getElementById("dark-palettes");
  const timezoneSelector = document.getElementById("timezone-selector");
  const shortcutsGrid = document.getElementById("shortcuts-grid");
  const shortcutModal = document.getElementById("shortcut-modal"),
    shortcutForm = document.getElementById("shortcut-form");
  const foldersGrid = document.getElementById("folders-grid");
  const folderModal = document.getElementById("folder-modal"),
    folderForm = document.getElementById("folder-form");
  const notesManagerModal = document.getElementById("notes-manager-modal"),
    notesList = document.getElementById("notes-list"),
    addNoteBtn = document.getElementById("add-note-btn");
  const noteEditorModal = document.getElementById("note-editor-modal"),
    noteEditorForm = document.getElementById("note-editor-form"),
    noteHtmlEditor = document.getElementById("note-html-editor"),
    notePreview = document.getElementById("note-preview");
  const saveStatusIndicator = document.getElementById("save-status-indicator");
  const greetingEl = document.getElementById("greeting"),
    clockEl = document.getElementById("clock");
  const shortcutsTitle = document.getElementById("shortcuts-title");
  const cancelBtns = document.querySelectorAll(".cancel-btn");
  const exportBtn = document.getElementById("export-btn");
  const importFile = document.getElementById("import-file");
  const deleteAllDataBtn = document.getElementById("delete-all-data-btn");
  const resetVaultBtn = document.getElementById("reset-vault-btn");
  const vaultSetupModal = document.getElementById("vault-setup-modal"),
    vaultSetupForm = document.getElementById("vault-setup-form");
  const vaultQrModal = document.getElementById("vault-qr-modal"),
    qrCodeContainer = document.getElementById("qr-code-container");
  const downloadQrBtn = document.getElementById("download-qr-btn"),
    closeQrBtn = document.getElementById("close-qr-btn");
  const vaultLoginModal = document.getElementById("vault-login-modal"),
    vaultLoginForm = document.getElementById("vault-login-form");
  const vaultRecoveryModal = document.getElementById("vault-recovery-modal"),
    vaultRecoveryForm = document.getElementById("vault-recovery-form");
  const passwordManagerModal = document.getElementById(
      "password-manager-modal"
    ),
    passwordsListEl = document.getElementById("passwords-list");
  const addPasswordForm = document.getElementById("add-password-form"),
    generatePasswordBtn = document.getElementById("generate-password-btn");
  const noteToolbar = document.getElementById("note-toolbar");
  const headingSelector = document.getElementById("heading-selector");
  const addCustomCTagBtn = document.getElementById("add-custom-c-tag");
  const openCalcModalBtn = document.getElementById("open-calc-modal-btn");
  const calculationModal = document.getElementById("calculation-modal");
  const calculationForm = document.getElementById("calculation-form");
  const calcVariableList = document.getElementById("calc-variable-list");
  const calcOperator = document.getElementById("calc-operator");
  const calcPreview = document.getElementById("calc-preview");
  const noteHtmlEditorContainer = document.getElementById(
    "note-html-editor-container"
  );
  const notePreviewContainer = document.getElementById(
    "note-preview-container"
  );
  const toggleHtmlEditorTab = document.getElementById("toggle-html-editor-tab");
  const exportNoteFormat = document.getElementById("export-note-format");

  let shortcuts = [];
  let folders = [];
  let notes = [];
  let activeFolderId = "root";
  let serverTime = null,
    lastSyncTime = null,
    clockInterval = null;
  let secureVault = null;
  let sessionDEK = null;
  let autoSaveTimer = null;
  let isSyncing = false;
  let savedRange = null;

  const KEYS = {
    shortcuts: "homepage_shortcuts",
    folders: "homepage_folders",
    theme: "homepage_theme",
    lightPalette: "homepage_lightPalette",
    darkPalette: "homepage_darkPalette",
    timezone: "homepage_timezone",
    secureData: "homepage_secureData",
    notes: "homepage_notes",
  };

  const cryptoUtils = {
    generateUID: () =>
      ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
      ),
    arrayBufferToBase64: (buffer) => {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    },
    base64ToArrayBuffer: (base64) => {
      const binary_string = window.atob(base64);
      const len = binary_string.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
      }
      return bytes.buffer;
    },
    deriveKeyFromPassword: async (password, salt) => {
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      return window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: enc.encode(salt),
          iterations: 200000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["wrapKey", "unwrapKey"]
      );
    },
    generateKey: async () =>
      await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      ),
    exportKey: async (key) =>
      cryptoUtils.arrayBufferToBase64(
        await window.crypto.subtle.exportKey("raw", key)
      ),
    importKey: async (keyData) =>
      await window.crypto.subtle.importKey(
        "raw",
        cryptoUtils.base64ToArrayBuffer(keyData),
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      ),
    wrapKey: async (keyToWrap, wrappingKey) => {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const wrappedKey = await window.crypto.subtle.wrapKey(
        "raw",
        keyToWrap,
        wrappingKey,
        { name: "AES-GCM", iv }
      );
      return {
        iv: cryptoUtils.arrayBufferToBase64(iv),
        data: cryptoUtils.arrayBufferToBase64(wrappedKey),
      };
    },
    unwrapKey: async (wrappedKeyData, iv, unwrappingKey) =>
      await window.crypto.subtle.unwrapKey(
        "raw",
        cryptoUtils.base64ToArrayBuffer(wrappedKeyData),
        unwrappingKey,
        { name: "AES-GCM", iv: cryptoUtils.base64ToArrayBuffer(iv) },
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      ),
    encrypt: async (data, key) => {
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(JSON.stringify(data))
      );
      return {
        iv: cryptoUtils.arrayBufferToBase64(iv),
        data: cryptoUtils.arrayBufferToBase64(encryptedContent),
      };
    },
    decrypt: async (encryptedData, iv, key) => {
      const dec = new TextDecoder();
      const decryptedContent = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: cryptoUtils.base64ToArrayBuffer(iv) },
        key,
        cryptoUtils.base64ToArrayBuffer(encryptedData)
      );
      return JSON.parse(dec.decode(decryptedContent));
    },
  };

  const applyTheme = (isDark, lightPalette, darkPalette) => {
    htmlElement.classList.toggle("dark", isDark),
      sunIcon.classList.toggle("hidden", isDark),
      moonIcon.classList.toggle("hidden", !isDark),
      (htmlElement.dataset.themeLight = lightPalette),
      (htmlElement.dataset.themeDark = darkPalette);
  };
  const toggleTheme = () => {
    const isDark = !htmlElement.classList.contains("dark");
    localStorage.setItem(KEYS.theme, isDark ? "dark" : "light");
    const lightPalette = localStorage.getItem(KEYS.lightPalette) || "slate",
      darkPalette = localStorage.getItem(KEYS.darkPalette) || "slate";
    applyTheme(isDark, lightPalette, darkPalette);
  };
  const updateActivePaletteSelectors = () => {
    const lightPalette = localStorage.getItem(KEYS.lightPalette) || "slate",
      darkPalette = localStorage.getItem(KEYS.darkPalette) || "slate";
    lightPalettesContainer
      .querySelectorAll(".palette-selector")
      .forEach((el) =>
        el.classList.toggle("active", el.dataset.palette === lightPalette)
      ),
      darkPalettesContainer
        .querySelectorAll(".palette-selector")
        .forEach((el) =>
          el.classList.toggle("active", el.dataset.palette === darkPalette)
        );
  };
  const initTheme = () => {
    const savedTheme = localStorage.getItem(KEYS.theme),
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches,
      isDark = savedTheme ? savedTheme === "dark" : prefersDark,
      lightPalette = localStorage.getItem(KEYS.lightPalette) || "slate",
      darkPalette = localStorage.getItem(KEYS.darkPalette) || "slate";
    applyTheme(isDark, lightPalette, darkPalette),
      updateActivePaletteSelectors();
  };

  const tick = () => {
    if (!serverTime) return;
    const elapsed = Date.now() - lastSyncTime,
      currentTime = new Date(serverTime.getTime() + elapsed),
      timezone =
        localStorage.getItem(KEYS.timezone) ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeStringForHour = currentTime.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour12: !1,
        hour: "2-digit",
      }),
      remoteHours = parseInt(timeStringForHour, 10);
    (clockEl.textContent = currentTime.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    })),
      (greetingEl.textContent =
        remoteHours < 5
          ? "¡Buenas noches!"
          : remoteHours < 12
          ? "¡Buenos días!"
          : remoteHours < 20
          ? "¡Buenas tardes!"
          : "¡Buenas noches!");
  };
  const updateClockFromAPI = async () => {
    const timezone =
      localStorage.getItem(KEYS.timezone) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const response = await fetch(
        `https://worldtimeapi.org/api/timezone/${timezone}`
      );
      if (!response.ok) throw new Error("Failed to fetch time");
      const data = await response.json();
      (serverTime = new Date(data.datetime)),
        (lastSyncTime = Date.now()),
        clockInterval && clearInterval(clockInterval),
        tick(),
        (clockInterval = setInterval(tick, 1e3));
    } catch (error) {
      console.error("Error updating time:", error),
        (clockEl.textContent = "Error");
    }
  };
  const loadTimezones = async () => {
    try {
      const response = await fetch("https://worldtimeapi.org/api/timezone"),
        timezones = await response.json();
      (timezoneSelector.innerHTML = ""),
        timezones.forEach((tz) => {
          const option = document.createElement("option");
          (option.value = tz),
            (option.textContent = tz.replace(/_/g, " ")),
            timezoneSelector.appendChild(option);
        }),
        (timezoneSelector.value =
          localStorage.getItem(KEYS.timezone) ||
          Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch (error) {
      console.error("Error loading timezones:", error),
        (timezoneSelector.innerHTML = "<option>Error al cargar</option>");
    }
  };

  const saveAllData = () => {
    localStorage.setItem(KEYS.shortcuts, JSON.stringify(shortcuts)),
      localStorage.setItem(KEYS.folders, JSON.stringify(folders)),
      localStorage.setItem(KEYS.notes, JSON.stringify(notes));
  };
  const loadAllData = () => {
    try {
      shortcuts = JSON.parse(localStorage.getItem(KEYS.shortcuts) || "[]");
    } catch (e) {
      shortcuts = [];
    }
    try {
      folders = JSON.parse(localStorage.getItem(KEYS.folders) || "[]");
    } catch (e) {
      folders = [];
    }
    try {
      notes = JSON.parse(localStorage.getItem(KEYS.notes) || "[]");
    } catch (e) {
      notes = [];
    }
  };
  const renderShortcuts = () => {
    shortcutsGrid.innerHTML = "";
    const shortcutsToRender = shortcuts.filter(
      (s) => s.folderId === activeFolderId
    );
    shortcutsToRender.forEach((shortcut) => {
      const el = document.createElement("div");
      (el.className = "relative group"),
        (el.innerHTML = `<a href="${shortcut.url}" class="card flex flex-col items-center justify-center p-4 aspect-square rounded-2xl text-center"><img src="${shortcut.imageUrl}" alt="Icono de ${shortcut.name}" class="h-10 w-10 sm:h-12 sm:w-12 mb-2 object-contain rounded-lg" onerror="this.src='https://placehold.co/64x64/e2e8f0/334155?text=Err'"><span class="text-xs font-semibold break-all">${shortcut.name}</span></a><button data-id="${shortcut.id}" class="remove-btn absolute top-1 right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-75 hover:bg-red-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>`),
        shortcutsGrid.appendChild(el);
    });
    const addBtn = document.createElement("button");
    (addBtn.className =
      "themed-dashed-btn flex flex-col items-center justify-center p-4 aspect-square rounded-2xl border-2 border-dashed transition-colors duration-200"),
      (addBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg><span class="text-xs font-semibold mt-2">Añadir</span>`),
      addBtn.addEventListener("click", () => {
        shortcutForm.reset(), showModal(shortcutModal);
      }),
      shortcutsGrid.appendChild(addBtn);
  };
  const renderFolders = () => {
    foldersGrid.innerHTML = "";
    const allFolderBtn = document.createElement("div");
    (allFolderBtn.innerHTML =
      '<button data-id="root" class="folder-btn card w-full h-16 flex items-center justify-center p-2 rounded-lg text-center font-semibold"><span class="truncate">Todos</span></button>'),
      foldersGrid.appendChild(allFolderBtn),
      folders.forEach((folder) => {
        const el = document.createElement("div");
        (el.className = "relative group"),
          (el.innerHTML = `<button data-id="${folder.id}" class="folder-btn card w-full h-16 flex items-center justify-center p-2 rounded-lg text-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg><span class="text-sm font-semibold truncate">${folder.name}</span></button><button data-id="${folder.id}" class="remove-folder-btn absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-75 hover:bg-red-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>`),
          foldersGrid.appendChild(el);
      });
    const addFolderContainer = document.createElement("div");
    (addFolderContainer.innerHTML =
      '<button id="add-folder-btn" class="card themed-dashed-btn flex items-center justify-center p-2 h-16 w-16 rounded-lg border-2 border-dashed transition-colors duration-200 flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>'),
      addFolderContainer
        .querySelector("#add-folder-btn")
        .addEventListener("click", () => {
          folderForm.reset(), showModal(folderModal);
        }),
      foldersGrid.appendChild(addFolderContainer),
      updateActiveFolderVisuals();
  };
  const updateActiveFolderVisuals = () => {
    document
      .querySelectorAll(".folder-btn")
      .forEach((btn) =>
        btn.classList.toggle("active", btn.dataset.id === activeFolderId)
      ),
      (shortcutsTitle.textContent =
        "root" === activeFolderId
          ? "Todos"
          : folders.find((f) => f.id === activeFolderId)?.name ||
            "Accesos Directos");
  };
  const addOrUpdateShortcut = (name, url, imageUrl, id) => {
    let finalImageUrl = imageUrl;
    finalImageUrl ||
      ((finalImageUrl = new URL(url).hostname),
      (finalImageUrl = `https://www.google.com/s2/favicons?domain=${finalImageUrl}&sz=128`));
    const newShortcut = {
      id: id || Date.now().toString(),
      name: name,
      url: url,
      imageUrl: finalImageUrl,
      folderId: activeFolderId,
    };
    shortcuts.push(newShortcut), saveAllData(), renderShortcuts();
  };
  const removeShortcut = (id) => {
    (shortcuts = shortcuts.filter((s) => s.id !== id)),
      saveAllData(),
      renderShortcuts();
  };
  const addFolder = (name) => {
    folders.push({ id: Date.now().toString(), name: name }),
      saveAllData(),
      renderFolders();
  };
  const removeFolder = (id) => {
    (folders = folders.filter((f) => f.id !== id)),
      (shortcuts = shortcuts.filter((s) => s.folderId !== id)),
      activeFolderId === id && (activeFolderId = "root"),
      saveAllData(),
      renderFolders(),
      renderShortcuts();
  };

  const processSymbolicCalculations = (html) => {
    let processedHtml = html;
    const variables = {};
    const varDefRegex = /<(c\d*)>([\s\S]*?)<\/\1>/g;
    processedHtml = processedHtml.replace(
      varDefRegex,
      (match, varName, value) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          variables[varName] = numValue;
        }
        return value;
      }
    );
    const expressionRegex =
      /<((?:c\d*|\d+\.?\d*)(?:[\+\-\*\/](?:c\d*|\d+\.?\d*))+?)>/g;
    processedHtml = processedHtml.replace(
      expressionRegex,
      (match, expression) => {
        try {
          const operands = expression.split(/[\+\-\*\/]/g);
          const operators = expression.match(/[\+\-\*\/]/g);
          const getValue = (operand) => {
            if (variables.hasOwnProperty(operand)) {
              return variables[operand];
            }
            const num = parseFloat(operand);
            return isNaN(num) ? null : num;
          };
          const firstValue = getValue(operands[0]);
          if (firstValue === null) {
            return `<span style="color: red;">(Error: Op. '${operands[0]}' inválido)</span>`;
          }
          let result = firstValue;
          for (let i = 0; i < operators.length; i++) {
            const operator = operators[i];
            const nextOperandName = operands[i + 1];
            const nextOperandValue = getValue(nextOperandName);
            if (nextOperandValue === null) {
              return `<span style="color: red;">(Error: Op. '${nextOperandName}' inválido)</span>`;
            }
            switch (operator) {
              case "+":
                result += nextOperandValue;
                break;
              case "-":
                result -= nextOperandValue;
                break;
              case "*":
                result *= nextOperandValue;
                break;
              case "/":
                if (nextOperandValue === 0)
                  return '<span style="color: red;">(Error: Div. por cero)</span>';
                result /= nextOperandValue;
                break;
            }
          }
          return `<strong style="color: var(--accent-light);">${result}</strong>`;
        } catch (e) {
          return '<span style="color: red;">(Error en expr.)</span>';
        }
      }
    );
    return processedHtml;
  };

  const generateNotePreview = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = processSymbolicCalculations(html);
    let text = tempDiv.textContent || tempDiv.innerText || "";
    return text.trim() ? text.trim() : "Nota sin título";
  };
  const renderNotes = () => {
    notesList.innerHTML = "";
    if (notes.length === 0) {
      notesList.innerHTML =
        '<p class="text-center text-gray-500 dark:text-gray-400">Aún no has guardado ninguna nota.</p>';
      return;
    }
    notes
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((note) => {
        const el = document.createElement("div");
        el.className =
          "card p-3 rounded-lg flex items-center themed-secondary-btn cursor-pointer";
        el.innerHTML = `<div class="flex-grow min-w-0"><p class="font-semibold truncate">${generateNotePreview(
          note.content
        )}</p><p class="text-sm text-gray-500 dark:text-gray-400">Modificado: ${new Date(
          note.date
        ).toLocaleString()}</p></div><button data-id="${
          note.id
        }" class="delete-note-btn p-2 text-red-500" title="Eliminar nota"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button>`;
        el.addEventListener("click", (e) => {
          if (e.target.closest(".delete-note-btn")) return;
          openNoteEditor(note.id);
        });
        el.querySelector(".delete-note-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          deleteNote(note.id);
        });
        notesList.appendChild(el);
      });
  };
  const openNoteEditor = (noteId = null) => {
    const icon = saveStatusIndicator.querySelector("svg");
    icon.classList.remove("animate-pulse", "accent-color", "text-red-500");
    icon.classList.add("text-gray-400");

    noteEditorForm.reset();
    document.getElementById("note-id").value = noteId || "";
    if (noteId) {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        noteHtmlEditor.value = note.content;
        notePreview.innerHTML = processSymbolicCalculations(note.content);
      }
    } else {
      noteHtmlEditor.value = "";
      notePreview.innerHTML = "";
    }
    showModal(noteEditorModal);
  };

  const saveNote = async () => {
    const icon = saveStatusIndicator.querySelector("svg");

    icon.classList.remove("text-gray-400", "text-red-500");
    icon.classList.add("accent-color", "animate-pulse");
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const id = document.getElementById("note-id").value;
          const content = noteHtmlEditor.value;
          const date = new Date().toISOString();
          if (id) {
            const noteIndex = notes.findIndex((n) => n.id === id);
            if (noteIndex > -1) {
              notes[noteIndex] = { ...notes[noteIndex], content, date };
            }
          } else {
            const newId = cryptoUtils.generateUID();
            notes.push({ id: newId, content, date });
            document.getElementById("note-id").value = newId;
          }
          saveAllData();
          renderNotes();

          icon.classList.remove("animate-pulse", "accent-color");
          icon.classList.add("text-gray-400");
          resolve();
        } catch (error) {
          console.error("Error al autoguardar la nota:", error);
          icon.classList.remove("animate-pulse", "accent-color");
          icon.classList.add("text-red-500");
          reject(error);
        }
      }, 500);
    });
  };

  const deleteNote = (noteId) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
      notes = notes.filter((n) => n.id !== noteId);
      saveAllData();
      renderNotes();
    }
  };

  const renderPasswords = () => {
    passwordsListEl.innerHTML = "";
    if (0 === secureVault.length)
      return void (passwordsListEl.innerHTML =
        '<p class="text-center text-gray-500 dark:text-gray-400">Aún no has guardado ninguna contraseña.</p>');
    secureVault
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((p) => {
        const el = document.createElement("div");
        (el.className =
          "card p-3 rounded-lg flex items-center themed-secondary-btn"),
          (el.innerHTML = `<div class="flex-grow"><p class="font-semibold">${
            p.desc
          }</p><p class="text-sm">${
            p.email || ""
          }</p></div><div class="flex items-center gap-2"><button class="copy-password-btn p-2" title="Copiar contraseña"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg></button><button class="delete-password-btn p-2 text-red-500" title="Eliminar contraseña"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button></div>`),
          el
            .querySelector(".copy-password-btn")
            .addEventListener("click", () => {
              navigator.clipboard
                .writeText(p.password)
                .then(() => alert("¡Contraseña copiada!"));
            }),
          el
            .querySelector(".delete-password-btn")
            .addEventListener("click", () => {
              (secureVault = secureVault.filter((item) => item.id !== p.id)),
                saveSecureVault(),
                renderPasswords();
            }),
          passwordsListEl.appendChild(el);
      });
  };
  const saveSecureVault = async () => {
    if (!sessionDEK)
      return console.error("No active session DEK to save vault.");
    const encryptedVault = await cryptoUtils.encrypt(secureVault, sessionDEK);
    const storedData = JSON.parse(localStorage.getItem(KEYS.secureData));
    storedData.vaultData = encryptedVault;
    localStorage.setItem(KEYS.secureData, JSON.stringify(storedData));
  };
  const generateAndShowPassword = () => {
    const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=",
      password = Array.from(crypto.getRandomValues(new Uint32Array(20)))
        .map((n) => charset[n % charset.length])
        .join("");
    document.getElementById("new-password-value").value = password;
  };

  const exportData = () => {
    const dataToExport = {
      [KEYS.shortcuts]: shortcuts,
      [KEYS.folders]: folders,
      [KEYS.notes]: notes,
      [KEYS.theme]: localStorage.getItem(KEYS.theme) || "light",
      [KEYS.lightPalette]: localStorage.getItem(KEYS.lightPalette) || "slate",
      [KEYS.darkPalette]: localStorage.getItem(KEYS.darkPalette) || "slate",
      [KEYS.timezone]:
        localStorage.getItem(KEYS.timezone) ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const secureData = localStorage.getItem(KEYS.secureData);
    if (secureData) {
      const parsed = JSON.parse(secureData);
      delete parsed.recoveryKey;
      dataToExport[KEYS.secureData] = parsed;
    }
    const dataStr = JSON.stringify(dataToExport, null, 2),
      blob = new Blob([dataStr], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    (a.href = url),
      (a.download = "mi_pagina_de_inicio.json"),
      document.body.appendChild(a),
      a.click(),
      document.body.removeChild(a),
      URL.revokeObjectURL(url);
  };
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    (reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData[KEYS.shortcuts] && importedData[KEYS.folders]) {
          localStorage.setItem(
            KEYS.shortcuts,
            JSON.stringify(importedData[KEYS.shortcuts] || [])
          ),
            localStorage.setItem(
              KEYS.folders,
              JSON.stringify(importedData[KEYS.folders] || [])
            ),
            localStorage.setItem(
              KEYS.notes,
              JSON.stringify(importedData[KEYS.notes] || [])
            ),
            localStorage.setItem(
              KEYS.theme,
              importedData[KEYS.theme] || "light"
            ),
            localStorage.setItem(
              KEYS.lightPalette,
              importedData[KEYS.lightPalette] || "slate"
            ),
            localStorage.setItem(
              KEYS.darkPalette,
              importedData[KEYS.darkPalette] || "slate"
            ),
            localStorage.setItem(
              KEYS.timezone,
              importedData[KEYS.timezone] ||
                Intl.DateTimeFormat().resolvedOptions().timeZone
            ),
            importedData[KEYS.secureData]
              ? localStorage.setItem(
                  KEYS.secureData,
                  JSON.stringify(importedData[KEYS.secureData])
                )
              : localStorage.removeItem(KEYS.secureData),
            location.reload();
        } else alert("El archivo de importación no tiene el formato correcto.");
      } catch (error) {
        console.error("Error al importar datos:", error),
          alert(
            "Error al leer el archivo. Asegúrate de que es un archivo JSON válido."
          );
      }
    }),
      reader.readAsText(file);
  };

  const showModal = (modal) => {
    modal.classList.remove("modal-hidden"),
      modal.classList.add("modal-visible");
  };
  const hideModal = (modal) => {
    modal.classList.add("modal-hidden");
    modal.classList.remove("modal-visible");
    if (modal === settingsModal) {
      resetDeleteButton();
    }
  };
  const resetDeleteButton = () => {
    deleteAllDataBtn.dataset.step = "1";
    deleteAllDataBtn.textContent = "Borrar Todos los Datos";
    deleteAllDataBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-600");
    deleteAllDataBtn.classList.add("bg-red-500", "hover:bg-red-600");
  };

  const applyTag = (tag) => {
    notePreview.focus();
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      document.execCommand("formatBlock", false, tag);
    } else {
      document.execCommand(tag, false, null);
    }
    notePreview.dispatchEvent(new Event("input", { bubbles: true }));
  };

  noteToolbar.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-tag]");
    if (button) {
      const commandMap = {
        b: "bold",
        i: "italic",
        u: "underline",
        s: "strikeThrough",
      };
      const command = commandMap[button.dataset.tag];
      if (command) applyTag(command);
    }
  });

  headingSelector.addEventListener("change", (e) => {
    if (e.target.value) {
      applyTag(e.target.value);
    }
    e.target.value = "";
  });

  addCustomCTagBtn.addEventListener("click", () => {
    notePreview.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const content = noteHtmlEditor.value;
    const cTags = content.match(/<c(\d+)>/g) || [];
    let nextCNumber = 1;
    if (cTags.length > 0) {
      const lastCNumber = Math.max(
        ...cTags.map((t) => parseInt(t.match(/\d+/)[0]))
      );
      nextCNumber = lastCNumber + 1;
    }
    const tagName = `c${nextCNumber}`;

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      document.execCommand(
        "insertHTML",
        false,
        `<${tagName}>&nbsp;</${tagName}>`
      );
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<${tagName}>${selection.toString()}</${tagName}>`
      );
    }
    notePreview.dispatchEvent(new Event("input", { bubbles: true }));
  });

  openCalcModalBtn.addEventListener("click", () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0);
    }
    populateCalculationModal();
    showModal(calculationModal);
  });

  const populateCalculationModal = () => {
    const content = noteHtmlEditor.value;
    const varDefRegex = /<(c\d*)>/g;
    const variables = [...content.matchAll(varDefRegex)].map(
      (match) => match[1]
    );
    const uniqueVariables = [...new Set(variables)];

    calcVariableList.innerHTML = "";
    if (uniqueVariables.length > 0) {
      uniqueVariables.forEach((varName) => {
        const div = document.createElement("div");
        div.className = "flex items-center";
        div.innerHTML = `<input type="checkbox" id="chk-${varName}" value="${varName}" class="h-4 w-4 rounded accent-color themed-input"><label for="chk-${varName}" class="ml-2">${varName}</label>`;
        calcVariableList.appendChild(div);
      });
    } else {
      calcVariableList.innerHTML =
        '<p class="text-gray-500">No hay variables definidas en la nota.</p>';
    }
    updateCalcPreview();
  };

  const updateCalcPreview = () => {
    const selectedVars = [
      ...calcVariableList.querySelectorAll("input:checked"),
    ].map((chk) => chk.value);
    const operator = calcOperator.value;
    if (selectedVars.length > 0) {
      calcPreview.textContent = `<${selectedVars.join(operator)}>`;
    } else {
      calcPreview.textContent = "";
    }
  };

  calculationForm.addEventListener("input", updateCalcPreview);

  calculationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const expression = calcPreview.textContent;
    if (!expression) return;

    noteHtmlEditor.focus();
    const cursorPosition = noteHtmlEditor.selectionStart;
    const endPosition = noteHtmlEditor.selectionEnd;
    const currentValue = noteHtmlEditor.value;
    const newValue =
      currentValue.substring(0, cursorPosition) +
      expression +
      currentValue.substring(endPosition);
    noteHtmlEditor.value = newValue;
    noteHtmlEditor.selectionStart = noteHtmlEditor.selectionEnd =
      cursorPosition + expression.length;

    hideModal(calculationModal);
    noteHtmlEditor.dispatchEvent(new Event("input", { bubbles: true }));
  });

  notePreview.addEventListener("input", () => {
    if (isSyncing) return;
    isSyncing = true;
    noteHtmlEditor.value = notePreview.innerHTML;
    isSyncing = false;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveNote, 1500);
  });

  noteHtmlEditor.addEventListener("input", () => {
    if (isSyncing) return;

    isSyncing = true;
    const rawHtml = noteHtmlEditor.value;
    const processedHtml = processSymbolicCalculations(rawHtml);
    notePreview.innerHTML = processedHtml;
    isSyncing = false;

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveNote, 1500);
  });

  toggleHtmlEditorTab.addEventListener("click", () => {
    const tabSpan = toggleHtmlEditorTab.querySelector("span");

    const isHidden = noteHtmlEditorContainer.classList.toggle("hidden");

    if (isHidden) {
      noteHtmlEditorContainer.classList.remove("pr-2");
      notePreviewContainer.classList.add("w-full");
      notePreviewContainer.classList.remove("w-1/2");

      toggleHtmlEditorTab.classList.remove(
        "right-0",
        "translate-x-full",
        "rounded-r-lg"
      );
      toggleHtmlEditorTab.classList.add(
        "-left-0.5",
        "-translate-x-full",
        "rounded-l-lg"
      );

      tabSpan.textContent = "HTML";
      tabSpan.classList.remove("rotate-[90deg]");
      tabSpan.classList.add("rotate-[-90deg]");
    } else {
      noteHtmlEditorContainer.classList.add("pr-2");
      notePreviewContainer.classList.remove("w-full");
      notePreviewContainer.classList.add("w-1/2");

      toggleHtmlEditorTab.classList.remove(
        "-left-0.5",
        "-translate-x-full",
        "rounded-l-lg"
      );
      toggleHtmlEditorTab.classList.add(
        "right-0",
        "translate-x-full",
        "rounded-r-lg"
      );

      tabSpan.textContent = "Cerrar";
      tabSpan.classList.remove("rotate-[-90deg]");
      tabSpan.classList.add("rotate-[90deg]");
    }
  });

  noteHtmlEditor.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const editor = e.target;
      const cursorPosition = editor.selectionStart;
      const endPosition = editor.selectionEnd;
      const textBeforeCursor = editor.value.substring(0, cursorPosition);

      let textToInsert = "<br>\n";
      if (textBeforeCursor.endsWith(">")) {
        const lastTagMatch = textBeforeCursor.match(
          /<(\/?)([a-zA-Z0-9]+)[^>]*>$/
        );

        if (lastTagMatch) {
          const tagName = lastTagMatch[2];
          if (!/^c\d*$/.test(tagName)) {
            textToInsert = "\n";
          }
        }
      }

      const currentValue = editor.value;
      const newValue =
        currentValue.substring(0, cursorPosition) +
        textToInsert +
        currentValue.substring(endPosition);
      editor.value = newValue;

      const newCursorPosition = cursorPosition + textToInsert.length;
      editor.selectionStart = editor.selectionEnd = newCursorPosition;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  noteHtmlEditor.addEventListener("keyup", (e) => {
    if (e.key === ">") {
      // Cambiamos el disparador a '>' para más control
      const text = noteHtmlEditor.value;
      const cursorPos = noteHtmlEditor.selectionStart;
      const textBefore = text.substring(0, cursorPos);

      // Busca una etiqueta abierta como <h1> o <p> justo antes del '>' que acabas de escribir
      const match = textBefore.match(/<([a-zA-Z0-9]+)>$/);

      if (match) {
        const tagName = match[1];
        // Lista de etiquetas que no se autocierran (void elements)
        const selfClosingTags = ["br", "hr", "img", "input", "link", "meta"];
        if (selfClosingTags.includes(tagName.toLowerCase())) {
          return;
        }

        // Inserta la etiqueta de cierre y coloca el cursor en medio
        const textAfter = text.substring(cursorPos);
        const newText = textBefore + `</${tagName}>` + textAfter;

        noteHtmlEditor.value = newText;
        // Coloca el cursor justo en medio de las dos etiquetas
        noteHtmlEditor.selectionStart = cursorPos;
        noteHtmlEditor.selectionEnd = cursorPos;
        noteHtmlEditor.dispatchEvent(new Event("input"));
      }
    }
  });

  themeToggleBtn.addEventListener("click", toggleTheme);
  settingsBtn.addEventListener("click", () => {
    updateActivePaletteSelectors(), showModal(settingsModal);
  });
  cancelBtns.forEach((btn) =>
    btn.addEventListener("click", (e) => {
      hideModal(e.target.closest(".modal-visible"));
    })
  );
  [
    shortcutModal,
    settingsModal,
    folderModal,
    vaultSetupModal,
    vaultLoginModal,
    vaultQrModal,
    passwordManagerModal,
    vaultRecoveryModal,
    notesManagerModal,
    noteEditorModal,
    calculationModal,
  ].forEach((modal) =>
    modal.addEventListener("click", (e) => {
      e.target === modal && hideModal(modal);
    })
  );
  shortcutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("shortcut-id").value,
      url = document.getElementById("shortcut-url").value,
      name = document.getElementById("shortcut-name").value,
      image = document.getElementById("shortcut-image").value;
    addOrUpdateShortcut(name, url, image, id), hideModal(shortcutModal);
  });
  folderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("folder-name").value;
    addFolder(name), hideModal(folderModal);
  });
  shortcutsGrid.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-btn");
    removeBtn && removeShortcut(removeBtn.dataset.id);
  });
  foldersGrid.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-folder-btn"),
      folderBtn = e.target.closest(".folder-btn");
    removeBtn
      ? removeFolder(removeBtn.dataset.id)
      : folderBtn &&
        ((activeFolderId = folderBtn.dataset.id),
        updateActiveFolderVisuals(),
        renderShortcuts());
  });
  lightPalettesContainer.addEventListener("click", (e) => {
    const selector = e.target.closest(".palette-selector");
    selector &&
      (localStorage.setItem(KEYS.lightPalette, selector.dataset.palette),
      initTheme());
  });
  darkPalettesContainer.addEventListener("click", (e) => {
    const selector = e.target.closest(".palette-selector");
    selector &&
      (localStorage.setItem(KEYS.darkPalette, selector.dataset.palette),
      initTheme());
  });
  timezoneSelector.addEventListener("change", (e) => {
    localStorage.setItem(KEYS.timezone, e.target.value), updateClockFromAPI();
  });
  exportBtn.addEventListener("click", exportData);
  importFile.addEventListener("change", importData);
  deleteAllDataBtn.addEventListener("click", () => {
    if (deleteAllDataBtn.dataset.step === "2") {
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
      location.reload();
    } else {
      deleteAllDataBtn.dataset.step = "2";
      deleteAllDataBtn.textContent = "¿Estás seguro? Confirmar Borrado";
      deleteAllDataBtn.classList.remove("bg-red-500", "hover:bg-red-600");
      deleteAllDataBtn.classList.add("bg-yellow-500", "hover:bg-yellow-600");
    }
  });
  resetVaultBtn.addEventListener("click", () => {
    if (!localStorage.getItem(KEYS.secureData)) {
      alert("Primero debes configurar tu bóveda segura.");
      return;
    }
    hideModal(settingsModal);
    showModal(vaultRecoveryModal);
  });
  notesBtn.addEventListener("click", () => {
    renderNotes();
    showModal(notesManagerModal);
  });
  addNoteBtn.addEventListener("click", () => openNoteEditor());
  profileBtn.addEventListener("click", () => {
    if (!localStorage.getItem(KEYS.secureData)) {
      showModal(vaultSetupModal);
    } else {
      showModal(vaultLoginModal);
    }
  });
  vaultSetupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const masterPassword = document.getElementById(
      "master-password-setup"
    ).value;
    if (masterPassword.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const uid = cryptoUtils.generateUID();
    const masterKey = await cryptoUtils.deriveKeyFromPassword(
      masterPassword,
      uid
    );
    const dek = await cryptoUtils.generateKey();
    const recoveryKey = await cryptoUtils.generateKey();
    const wrappedDEK = await cryptoUtils.wrapKey(dek, masterKey);
    const wrappedDEKForRecovery = await cryptoUtils.wrapKey(dek, recoveryKey);
    const secureData = {
      uid,
      wrappedDEK,
      vaultData: await cryptoUtils.encrypt([], dek),
    };
    localStorage.setItem(KEYS.secureData, JSON.stringify(secureData));
    const recoveryData = {
      uid,
      wrappedDEKForRecovery,
      recoveryKey: await cryptoUtils.exportKey(recoveryKey),
    };
    hideModal(vaultSetupModal);
    const qr = qrcode(0, "L");
    qr.addData(JSON.stringify(recoveryData));
    qr.make();
    qrCodeContainer.innerHTML = qr.createImgTag(6, 8);
    showModal(vaultQrModal);
  });
  downloadQrBtn.addEventListener("click", () => {
    const img = qrCodeContainer.querySelector("img");
    const canvas = document.createElement("canvas");
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "vault_recovery_backup.png";
    a.click();
  });
  closeQrBtn.addEventListener("click", () => {
    hideModal(vaultQrModal);
    document.getElementById("master-password-login").value =
      document.getElementById("master-password-setup").value;
    vaultLoginForm.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  });
  vaultLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const masterPassword = document.getElementById(
      "master-password-login"
    ).value;
    const loginError = document.getElementById("login-error");
    const storedData = JSON.parse(localStorage.getItem(KEYS.secureData));
    try {
      loginError.classList.add("hidden");
      const masterKey = await cryptoUtils.deriveKeyFromPassword(
        masterPassword,
        storedData.uid
      );
      sessionDEK = await cryptoUtils.unwrapKey(
        storedData.wrappedDEK.data,
        storedData.wrappedDEK.iv,
        masterKey
      );
      secureVault = await cryptoUtils.decrypt(
        storedData.vaultData.data,
        storedData.vaultData.iv,
        sessionDEK
      );
      hideModal(vaultLoginModal);
      showModal(passwordManagerModal);
      renderPasswords();
      vaultLoginForm.reset();
    } catch (err) {
      loginError.classList.remove("hidden");
      console.error("Decryption failed:", err);
    }
  });
  vaultRecoveryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const file = document.getElementById("recovery-backup-file").files[0];
    const errorEl = document.getElementById("recovery-error");
    if (!file) return alert("Por favor, selecciona tu archivo de respaldo.");
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        errorEl.classList.add("hidden");
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (!code)
            throw new Error("No se pudo leer el código QR del archivo.");
          const backupData = JSON.parse(code.data);
          if (
            !backupData.uid ||
            !backupData.wrappedDEKForRecovery ||
            !backupData.recoveryKey
          ) {
            throw new Error("El respaldo QR no es válido o está corrupto.");
          }
          const recoveryKey = await cryptoUtils.importKey(
            backupData.recoveryKey
          );
          const dek = await cryptoUtils.unwrapKey(
            backupData.wrappedDEKForRecovery.data,
            backupData.wrappedDEKForRecovery.iv,
            recoveryKey
          );
          hideModal(vaultRecoveryModal);
          vaultRecoveryForm.reset();
          const newMasterPassword = prompt(
            "Recuperación exitosa. Por favor, introduce tu NUEVA contraseña maestra (mínimo 8 caracteres):"
          );
          if (!newMasterPassword || newMasterPassword.length < 8) {
            return alert(
              "Contraseña no válida. El proceso de recuperación ha sido cancelado."
            );
          }
          const newMasterKey = await cryptoUtils.deriveKeyFromPassword(
            newMasterPassword,
            backupData.uid
          );
          const newWrappedDEK = await cryptoUtils.wrapKey(dek, newMasterKey);
          const storedData = JSON.parse(localStorage.getItem(KEYS.secureData));
          storedData.wrappedDEK = newWrappedDEK;
          localStorage.setItem(KEYS.secureData, JSON.stringify(storedData));
          alert(
            "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña."
          );
        };
        img.onerror = () => {
          throw new Error("No se pudo cargar el archivo de imagen.");
        };
        img.src = event.target.result;
      } catch (err) {
        console.error("Vault recovery failed:", err);
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      }
    };
    reader.readAsDataURL(file);
  });
  generatePasswordBtn.addEventListener("click", generateAndShowPassword);
  addPasswordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newPassword = {
      id: cryptoUtils.generateUID(),
      desc: document.getElementById("new-password-desc").value,
      email: document.getElementById("new-password-email").value,
      password: document.getElementById("new-password-value").value,
      date: new Date().toISOString(),
    };
    if (!newPassword.password)
      return alert("El campo de contraseña no puede estar vacío.");
    secureVault.push(newPassword);
    saveSecureVault();
    renderPasswords();
    addPasswordForm.reset();
  });

  exportNoteFormat.addEventListener("change", async (e) => {
    const format = e.target.value;
    if (!format) return;

    e.target.value = "";

    const title = (notePreview.querySelector("h1, h2, h3")?.innerText || "nota")
      .trim()
      .replace(/\s+/g, "_");
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${title}_${timestamp}`;

    switch (format) {
      case "txt": {
        const content = notePreview.innerText;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        downloadFile(url, `${filename}.txt`);
        URL.revokeObjectURL(url);
        break;
      }
      case "html": {
        const content = noteHtmlEditor.value;
        const blob = new Blob([content], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        downloadFile(url, `${filename}.html`);
        URL.revokeObjectURL(url);
        break;
      }
      case "png": {
        try {
          const canvas = await html2canvas(notePreview, {
            backgroundColor: getComputedStyle(notePreview).backgroundColor,
          });
          const imageUrl = canvas.toDataURL("image/png");
          downloadFile(imageUrl, `${filename}.png`);
        } catch (error) {
          console.error("Error al exportar como PNG:", error);
          alert("Hubo un error al generar la imagen.");
        }
        break;
      }
      case "pdf": {
        try {
          const { jsPDF } = window.jspdf;
          const canvas = await html2canvas(notePreview, {
            backgroundColor: getComputedStyle(notePreview).backgroundColor,
            scale: 2,
          });
          const imgData = canvas.toDataURL("image/png");

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;

          let newWidth = pdfWidth;
          let newHeight = newWidth / ratio;

          if (newHeight > pdfHeight) {
            newHeight = pdfHeight;
            newWidth = newHeight * ratio;
          }

          const x = (pdfWidth - newWidth) / 2;
          const y = (pdfHeight - newHeight) / 2;

          pdf.addImage(imgData, "PNG", x, y, newWidth, newHeight);
          pdf.save(`${filename}.pdf`);
        } catch (error) {
          console.error("Error al exportar como PDF:", error);
          alert("Hubo un error al generar el PDF.");
        }
        break;
      }
    }
  });

  function downloadFile(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  loadAllData();
  initTheme();
  renderFolders();
  renderShortcuts();
  loadTimezones();
  updateClockFromAPI();
  setInterval(updateClockFromAPI, 5 * 60 * 1000);
});
