window.updateHistoryList = async function() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  
  const history = await storageManager.getHistory();
  
  historyList.innerHTML = '';
  
  history.forEach(entry => {
    const timestamp = new Date(entry.timestamp);
    const formattedDate = timestamp.toLocaleDateString('de-DE') + 
      ', ' + timestamp.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    
    const languageDisplay = entry.languageLabel || getLanguageLabel(entry.language) || entry.language;
    const styleDisplay = entry.styleLabel || getStyleLabel(entry.language, entry.style) || entry.style;
    const directionDisplay = entry.directionLabel || getDirectionLabel(entry.direction) || entry.direction;

    const entryElement = document.createElement('div');
    entryElement.className = 'history-entry';
    entryElement.innerHTML = `
      <div class="history-entry-header">
        <div class="history-metadata">
          ${formattedDate} | ${languageDisplay} → ${styleDisplay} | ${directionDisplay}
        </div>
      </div>
      <div class="history-texts">
        <div class="history-text">
          <div class="history-label">Input</div>
          ${entry.input}
        </div>
        <div class="history-text">
          <div class="history-label">Output</div>
          ${entry.output}
        </div>
      </div>
    `;
    
    historyList.appendChild(entryElement);
  });
}

let currentMappings = null;
let reverseMappings = null;
let isLatinInput = false;

const themeUpdaters = [];

const characterNormalizationMap = {'Α':'A', 'А':'A', 'Ɑ':'A', 'Ꭺ':'A', 'Β':'B', 'В':'B', 'С':'C', 'Ⅽ':'C', 'Ꮯ':'C', 
    'С̨̆':'C̨̆', 'С̨٘':'C̨̆', 'С̨ٚ':'C̨̆', 'С̨̌':'C̨̆', 'Ꭰ':'D', 'ԁ':'d', 'Ε':'E', 'Е':'E', 'ⴹ':'E', 'Ϝ':'F', 'ɡ':'G', 'ɢ':'G', 'Ԍ':'G', 
    'Ꮐ':'G', 'Н':'H', 'Η':'H', 'Н':'H', 'Ꮋ':'H', 'Ḥ':'Ḥ', '𝖧࣭':'Ḥ', 'Ḥ':'Ḥ', 'І':'I', 'Ӏ':'I', 'І̆':'Ĭ', 'Ῐ':'Ĭ', 'l̆':'Ĭ', 
    'Ĭ':'Ĭ', 'Ј':'J', 'Ꭻ':'J', 'Κ':'K', 'К':'K', 'Ꮶ':'K', 'Ꮮ':'L', 'Լ':'L', 'Ⳑ':'L', 'Μ':'M', 'М':'M', 'Ꮇ':'M', 'Ν':'N', 
    'Ⲛ':'N', 'Ο':'O', 'О':'O', '𐤏':'O', 'Օ':'O', '𐌏':'O', 'Ⲟ':'O', 'Ꮲ':'P', 'Ρ':'P', 'Р':'P', 'Ԛ':'Q', 'Ꭱ':'R', 'Ꮢ':'R', 
    'Ѕ':'S', 'Ꮪ':'S', 'Τ':'T', 'Т':'T', 'Ꭲ':'T', 'Ս':'U', 'ꓴ':'U', '∨':'V', '۷':'V', 'Ԝ':'W', 'Ꮃ':'W', 'ꓪ':'W', 'Х':'X', 
    'Ⲭ':'X', 'Ү':'Y', 'Υ':'Y', 'Ⲩ':'Y', 'Ζ':'Z', 'Ꮓ':'Z', 'ꓜ':'Z', 'À':'À', 'А̀':'À', 'Ὰ':'À', 'Â':'Â', 'А̂':'Â', 'Α̂':'Â', 
    'Ä':'Ä', 'Ӓ':'Ä', 'Α̈':'Ä', 'Ӓ':'Ä', 'Ǎ':'Ǎ', 'А̌':'Ǎ', 'Α̌':'Ǎ', 'А̋':'A̋', 'Α̋':'A̋', 'Ć':'Ć', 'С́':'Ć', 'Č':'Č', 'С̆':'Č', 
    'С̌':'Č', 'Ð':'Đ', 'D̑':'D̂', 'D̂':'D̂', 'È':'È', 'Ѐ':'È', 'Ὲ':'È', 'Ė':'Ė', 'Е̇':'Ė', 'Ε̇':'Ė', 'Ê':'Ê', 'Е̂':'Ê', 'Ε̂':'Ê', 
    'Ë':'Ë', 'Ё':'Ë', 'Ε̈':'Ë', 'Ě':'Ě', 'Е̌':'Ě', 'Ę':'Ę', 'Е̨':'Ę', 'Eْ':'E̊', 'ⴹ̊':'E̊', 'Ḟ':'Ḟ', 'Ī':'Ī', 'І́':'Í', 'І̀':'Ì', 
    'І̂':'Î', 'І̌':'Ǐ', 'Ї':'Ï', 'Ї':'Ï', 'Ķ':'K̦', 'К̦':'K̦', 'Ǩ':'Ǩ', 'Ќ':'Ḱ', 'Ḱ':'Ḱ', 'Ḳ':'Ḳ', 'Ļ':'L̦', 'Ń':'Ń', 'Ǹ':'Ǹ', 
    'Ṅ':'Ṅ', 'Ň':'Ň', 'Ņ':'N̦', 'О́':'Ó', 'О̀':'Ò', 'О̂':'Ô', 'О̄':'Ō', 'О̋':'Ő', 'Ӧ':'Ö', 'Ṕ':'Ṕ', 'Ѕ̀':'S̀', 'Ѕ́':'Ś', 'Ѕ̂':'Ŝ', 
    'Ѕ̌':'Š', 'Ş':'Ș', 'Ș':'Ș', 'Ț':'Ț', 'Ţ':'Ț', 'Uٛ':'Û', '𖽂̐':'U̐', 'Ż':'Ż', 'Ẑ':'Ẑ', 'Ž':'Ž', 'ꓴ꙼':'Ŭ', 'Ǔ':'Ŭ', 'α':'a', 
    'а':'a', 'ɑ':'a', 'ꭺ':'a', 'β':'b', 'в':'b', 'с':'c', 'ⅽ':'c', 'ꮯ':'c', 'с̨̆':'c̨̆', 'с̨٘':'c̨̆', 'с̨ٚ':'c̨̆', 'с̨̌':'c̨̆', 'ԁ':'d', 
    'ε':'e', 'е':'e', 'ⴹ':'e', 'ϝ':'f', 'ɡ':'g', 'ɢ':'g', 'ԍ':'g', 'н':'h', 'η':'h', 'н':'h', 'ḥ':'ḥ', '𝖧࣭':'ḥ', 'ḥ':'ḥ', 
    'і':'i', 'ӏ':'i', 'і̆':'ĭ', 'ῐ':'ĭ', 'l̆':'ĭ', 'ĭ':'ĭ', 'ј':'j', 'κ':'k', 'к':'k', 'լ':'l', 'ⳑ':'l', 'μ':'m', 'м':'m', 
    'ν':'n', 'ⲛ':'n', 'ο':'o', 'о':'o', '𐤏':'o', 'օ':'o', '𐌏':'o', 'ⲟ':'o', 'ρ':'p', 'р':'p', 'ԛ':'q', 'ѕ':'s', 'τ':'t', 
    'т':'t', 'ս':'u', 'ꓴ':'u', '∨':'v', '۷':'v', 'ԝ':'w', 'ꓪ':'w', 'х':'x', 'ⲭ':'x', 'ү':'y', 'υ':'y', 'ⲩ':'y', 'ζ':'z',  
    'ꓜ':'z', 'à':'à', 'а̀':'à', 'ὰ':'à', 'â':'â', 'а̂':'â', 'α̂':'â', 'ä':'ä', 'ӓ':'ä', 'α̈':'ä', 'ӓ':'ä', 'ǎ':'ǎ', 'а̌':'ǎ', 
    'α̌':'ǎ', 'а̋':'a̋', 'α̋':'a̋', 'ć':'ć', 'с́':'ć', 'č':'č', 'с̆':'č', 'с̌':'č', 'ð':'đ', 'd̑':'d̂', 'd̂':'d̂', 'è':'è', 'ѐ':'è', 
    'ὲ':'è', 'ė':'ė', 'е̇':'ė', 'ε̇':'ė', 'ê':'ê', 'е̂':'ê', 'ε̂':'ê', 'ë':'ë', 'ё':'ë', 'ε̈':'ë', 'ě':'ě', 'е̌':'ě', 'ę':'ę', 
    'е̨':'ę', 'eْ':'e̊', 'ⴹ̊':'e̊', 'ḟ':'ḟ', 'ī':'ī', 'і́':'í', 'і̀':'ì', 'і̂':'î', 'і̌':'ǐ', 'ї':'ï', 'ї':'ï', 'ķ':'k̦', 'к̦':'k̦', 
    'ǩ':'ǩ', 'ќ':'ḱ', 'ḱ':'ḱ', 'ḳ':'ḳ', 'ļ':'l̦', 'ń':'ń', 'ǹ':'ǹ', 'ṅ':'ṅ', 'ň':'ň', 'ņ':'n̦', 'о́':'ó', 'о̀':'ò', 'о̂':'ô', 
    'о̄':'ō', 'о̋':'ő', 'ӧ':'ö', 'ṕ':'ṕ', 'ѕ̀':'s̀', 'ѕ́':'ś', 'ѕ̂':'ŝ', 'ѕ̌':'š', 'ş':'ș', 'ș':'ș', 'ț':'ț', 'ţ':'ț', 'uٛ':'û', 
    '𖽂̐':'u̐', 'ż':'ż', 'ẑ':'ẑ', 'ž':'ž', 'ꓴ꙼':'ŭ', 'ǔ':'ŭ'}

function updateAllThemeElements(newTheme) {
  document.documentElement.setAttribute('data-theme', newTheme);
  
  const toggles = document.querySelectorAll('#darkModeToggle');
  toggles.forEach(toggle => {
    toggle.checked = newTheme === 'dark';
  });
  
  updateThemeIcon(newTheme);
}

async function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  await storageManager.saveTheme(newTheme);
  updateAllThemeElements(newTheme);
}

document.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = await storageManager.getTheme();
  updateAllThemeElements(savedTheme);

  document.querySelectorAll('#darkModeToggle').forEach(toggle => {
    toggle.checked = savedTheme === 'dark';
    toggle.addEventListener('change', toggleTheme);
  });

  const isPopup = !document.getElementById('languageSelect');
  
  if (!isPopup) {
    updateThemeIcon(savedTheme);
    
    const elements = {
      languageSelect: document.getElementById('languageSelect'),
      styleSelect: document.getElementById('styleSelect'),
      convertButton: document.getElementById('convertButton'),
      copyButton: document.getElementById('copyButton'),
      themeToggle: document.getElementById('themeToggle'),
      helpToggle: document.getElementById('helpToggle'),
      cyrillicBtn: document.getElementById('cyrillicBtn'),
      latinBtn: document.getElementById('latinBtn'),
      directionToggle: document.getElementById('directionToggle'),
      addFavorite: document.getElementById('addFavorite')
    };
    
    if (elements.languageSelect) elements.languageSelect.addEventListener('change', handleLanguageChange);
    if (elements.styleSelect) elements.styleSelect.addEventListener('change', loadTranscriptionMap);
    if (elements.convertButton) elements.convertButton.addEventListener('click', handleConversion);
    if (elements.copyButton) elements.copyButton.addEventListener('click', copyToClipboard);
    if (elements.themeToggle) elements.themeToggle.addEventListener('click', toggleTheme);
    if (elements.cyrillicBtn) elements.cyrillicBtn.addEventListener('click', () => setInputMode(false));
    if (elements.latinBtn) elements.latinBtn.addEventListener('click', () => setInputMode(true));
    if (elements.directionToggle) elements.directionToggle.addEventListener('click', toggleDirection);
    if (elements.addFavorite) elements.addFavorite.addEventListener('click', handleAddFavorite);

    
    const lastUsed = await storageManager.getLastUsedSettings();
    if (lastUsed.language && elements.languageSelect) {
      elements.languageSelect.value = lastUsed.language;
      await handleLanguageChange({ target: { value: lastUsed.language } });
      if (lastUsed.style && elements.styleSelect) {
        elements.styleSelect.value = lastUsed.style;
        await loadTranscriptionMap();
      }
    }
    
    await updateHistoryList();
    await updateFavoritesList();
    
  }
});

function setLanguage(lang) {
  setInputMode(lang === 'latin');
}

function updateThemeIcon(theme) {
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.checked = theme === 'dark';
  }
}


function setInputMode(latin) {
  isLatinInput = latin;
  const cyrillicBtn = document.getElementById('cyrillicBtn');
  const latinBtn = document.getElementById('latinBtn');
  
  if (cyrillicBtn) cyrillicBtn.classList.toggle('active', !latin);
  if (latinBtn) latinBtn.classList.toggle('active', latin);
  
  const directionToggle = document.getElementById('directionToggle');
  if (directionToggle) {
    directionToggle.classList.toggle('reversed', latin);
  }
  
  const inputText = document.getElementById('inputText');
  if (inputText) {
    inputText.placeholder = `Enter ${latin ? 'Latin' : 'Cyrillic'} text here...`;
    
    inputText.value = '';
    const outputText = document.getElementById('outputText');
    if (outputText) outputText.value = '';
  }
}

function toggleDirection() {
  setInputMode(!isLatinInput);
}

function getLanguageLabel(value) {
  const languageSelect = document.getElementById('languageSelect');
  if (!languageSelect) return value;
  
  const option = Array.from(languageSelect.options).find(opt => opt.value === value);
  return option ? option.textContent : value;
}

function getStyleLabel(languageValue, styleValue) {
  const styleSelect = document.getElementById('styleSelect');
  if (styleSelect) {
    const option = Array.from(styleSelect.options).find(opt => opt.value === styleValue);
    if (option) {
      return option.textContent;
    }
  }
  
  const styles = availableStyles[languageValue.toLowerCase()] || [];
  const styleObject = styles.find(style => style.value === styleValue);
  return styleObject ? styleObject.label : styleValue;
}

function getDirectionLabel(direction) {
  const directionLabels = {
    'latin-to-cyrillic': 'Latin to Cyrillic',
    'cyrillic-to-latin': 'Cyrillic to Latin'
  };
  return directionLabels[direction] || direction;
}

async function handleLanguageChange(event) {
  const language = event.target.value;
  const styleSelect = document.getElementById('styleSelect');
  if (!styleSelect) return;
  
  styleSelect.innerHTML = '<option value="">Select Style</option>';

  if (!language) return;

  const styles = getAvailableStyles(language);
  styles.forEach(style => {
    const option = document.createElement('option');
    option.value = style.value;
    option.textContent = style.label;
    styleSelect.appendChild(option);
  });

  await storageManager.saveLastUsedSettings({
    language,
    style: ''
  });
}

function getAvailableStyles(language) {
  const lowerLanguage = language.toLowerCase();
  
  return availableStyles[lowerLanguage] || [];
}

async function loadTranscriptionMap() {
  const languageSelect = document.getElementById('languageSelect');
  const styleSelect = document.getElementById('styleSelect');
  
  if (!languageSelect || !styleSelect) return;
  
  const language = languageSelect.value.toLowerCase();
  const style = styleSelect.value.toLowerCase();

  if (!language || !style) {
    currentMappings = null;
    reverseMappings = null;
    return;
  }

  try {
    if (transcriptionMaps[language] && transcriptionMaps[language][style]) {
      if (language === 'belarusian' && style === 'lacinka') {
        currentMappings = transcriptionMaps[language][style].to_lacinka;
      } else if (language === 'ukrainian' && style === 'national_dstu_9112_2021_a') {
        currentMappings = transcriptionMaps[language][style].to_latinka;
      } else if (language === 'ukrainian' && style === 'national_dstu_9112_2021_b') {
        currentMappings = transcriptionMaps[language][style].to_latinka;
      } else if (language === 'ukrainian' && style === 'national_rm_p55_2010') {
        currentMappings = transcriptionMaps[language][style].to_latinka;
      } else if (language === 'bulgarian' && style === 'bgn_2013') {
        currentMappings = transcriptionMaps[language][style].to_latinka;
      } else if (language === 'belarusian' && style === 'national_2023') {
        currentMappings = transcriptionMaps[language][style].to_latinka;  
      } else {
        currentMappings = transcriptionMaps[language][style];
      }

      if (currentMappings._transliterate) {
        reverseMappings = null; 
        console.log('Loaded functional transliterator for', language, style);
      } else {
        const regularMappings = { ...currentMappings };
        
        const upperMappings = {};
        for (const [cyrillic, latin] of Object.entries(regularMappings)) {
          upperMappings[cyrillic.toUpperCase()] = latin.charAt(0).toUpperCase() + latin.slice(1);
        }
        currentMappings = { ...regularMappings, ...upperMappings };
        
        reverseMappings = {};
        for (const [cyrillic, latin] of Object.entries(currentMappings)) {
          if (latin && latin.length > 0) {
            reverseMappings[latin] = cyrillic;
          }
        }
      }
    } else {
      console.error('No mappings found for', language, style);
      currentMappings = null;
      return;
    }

    await storageManager.saveLastUsedSettings({
      language,
      style
    });
  } catch (error) {
    console.error('Error loading transcription map:', error);
    currentMappings = null;
    reverseMappings = null;
  }
}



function normalizeLatinInput(text) {
  if (!text) return { normalizedText: text, replacements: [] };
  
  let normalizedText = text;
  const replacements = [];
  
  const ligatureMappings = {
    'K͡H':'K︠H︡','K͡S':'K︠S︡','I͡A':'I︠A︡','I͡E':'I︠E︡','I͡Ę':'I︠Ę︡','I͡Ǫ':'I︠Ǫ︡',
    'I͡U':'I︠U︡','P͡S':'P︠S︡','T͡S':'T︠S︡','Z͡H':'Z︠H︡','Ō͡T':'Ō︠T︡', 'k͡h':'k︠h︡',
    'k͡s':'k︠s︡','i͡a':'i︠a︡','i͡e':'i︠e︡','i͡ę':'i︠ę︡','i͡ǫ':'i︠ǫ︡',
    'i͡u':'i︠u︡','p͡s':'p︠s︡','t͡s':'t︠s︡','z͡h':'z︠h︡','ō͡t':'ō︠t︡'
  };
  
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  for (const [ligature, replacement] of Object.entries(ligatureMappings)) {
    const parts = ligature.split('͡');
    if (parts.length !== 2) continue;
    
    const before = escapeRegExp(parts[0]);
    const after = escapeRegExp(parts[1]);
    const pattern = new RegExp(`${before}͡${after}`, 'g');
    
    const matches = normalizedText.match(pattern);
    if (matches && matches.length > 0) {
      normalizedText = normalizedText.replace(pattern, replacement);
      replacements.push({
        original: ligature,
        replacement: replacement,
        count: matches.length
      });
    }
  }
  
  for (const [lookAlike, latinChar] of Object.entries(characterNormalizationMap)) {
    let shouldSkip = false;
    for (const ligature of Object.keys(ligatureMappings)) {
      if (ligature === lookAlike) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;
    
    if (normalizedText.includes(lookAlike)) {
      const count = (normalizedText.match(new RegExp(escapeRegExp(lookAlike), 'g')) || []).length;
      normalizedText = normalizedText.replaceAll(lookAlike, latinChar);
      
      replacements.push({
        original: lookAlike,
        replacement: latinChar,
        count: count
      });
    }
  }
  
  return {
    normalizedText,
    replacements
  };
}

function showReplacementNotification(replacements) {
  if (replacements.length === 0) return;
  
  const uniqueReplacements = replacements.length;
  const totalReplacements = replacements.reduce((sum, rep) => sum + rep.count, 0);
  
  let message = `${totalReplacements} character${totalReplacements > 1 ? 's' : ''} has/have been replaced:`;
  replacements.forEach(rep => {
    message += `\n• "${rep.original}" → "${rep.replacement}" (${rep.count} time${rep.count > 1 ? 's' : ''})`;
  });
  
if ('Notification' in window) {
  if (Notification.permission === 'granted') {
    new Notification('Character Normalisation', { 
      body: message,
      icon: 'icons/icon128light.png'
    });
  } else {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('Character Normalisation', { 
          body: message,
          icon: 'icons/icon128light.png'
        });
      } else {
        showFallback();
      }
    });
  }
} else {
  showFallback();
}

function showFallback() {
  console.log('Character normalization:', message);
  alert('Character Normalisation:\n' + message);
}
}

async function handleConversion() {
  const inputText = document.getElementById('inputText')?.value;
  if (!inputText) return;
  
  const outputTextElement = document.getElementById('outputText');
  if (!outputTextElement) return;
  
  if (!currentMappings) {
    await loadTranscriptionMap();
    if (!currentMappings) {
      console.error('No mappings available for conversion');
      return;
    }
  }

  let outputText;
  let processedInputText = inputText;
  
  if (isLatinInput && reverseMappings) {
    const { normalizedText, replacements } = normalizeLatinInput(inputText);
    processedInputText = normalizedText;
    
    if (replacements.length > 0) {
      showReplacementNotification(replacements);
    }
  }

  if (currentMappings._transliterate && typeof currentMappings._transliterate === 'function' && !isLatinInput) {
    outputText = currentMappings._transliterate(processedInputText);
  } else if (isLatinInput && !reverseMappings) {
    console.error('Reverse conversion not supported for this style');
    return;
  } else {
    const mappingsToUse = isLatinInput ? reverseMappings : currentMappings;
    outputText = transcribeText(processedInputText, mappingsToUse);
  }
  
  outputTextElement.value = outputText;

  const languageSelect = document.getElementById('languageSelect');
  const styleSelect = document.getElementById('styleSelect');
  
  if (languageSelect && styleSelect) {
    const languageValue = languageSelect.value;
    const styleValue = styleSelect.value;
    const languageLabel = getLanguageLabel(languageValue);
    const styleLabel = getStyleLabel(languageValue, styleValue);
    const direction = isLatinInput ? 'latin-to-cyrillic' : 'cyrillic-to-latin';
    const directionLabel = getDirectionLabel(direction);
    
    await storageManager.addHistoryEntry({
      timestamp: new Date().toISOString(),
      language: languageValue,
      languageLabel: languageLabel,
      style: styleValue,
      styleLabel: styleLabel,
      input: inputText,
      output: outputText,
      direction: direction,
      directionLabel: directionLabel
    });

    await updateHistoryList();
  }
}

function transcribeText(text, mappings) {
  if (!text || !mappings) return text;
  
  const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);
  
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    let matched = false;
    
    for (const key of sortedKeys) {
      if (text.substr(i, key.length) === key) {
        result += mappings[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  
  return result;
}

async function copyToClipboard() {
  const outputText = document.getElementById('outputText')?.value;
  if (!outputText) return;

  try {
    await navigator.clipboard.writeText(outputText);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
}


async function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  await storageManager.saveTheme(newTheme);
  updateThemeIcon(newTheme);
}

async function updateFavoritesList() {
  const favoritesSection = document.getElementById('favoritesSection');
  if (!favoritesSection) return;
  
  const favorites = await storageManager.getFavorites();
  
  favoritesSection.innerHTML = '';
  
  favorites.forEach(favorite => {
    const languageDisplay = favorite.languageLabel || getLanguageLabel(favorite.language) || favorite.language;
    const styleDisplay = favorite.styleLabel || getStyleLabel(favorite.language, favorite.style) || favorite.style;
    
    const button = document.createElement('button');
    button.className = 'favorite-button';
    button.innerHTML = `
      <span class="material-symbols-outlined">heart_minus</span>
      ${languageDisplay} - ${styleDisplay}
    `;
    
    button.addEventListener('click', (e) => {
      if (e.target.classList.contains('material-symbols-outlined')) {
        handleRemoveFavorite(favorite.language, favorite.style);
      } else {
        activateFavorite(favorite);
      }
    });
    
    favoritesSection.appendChild(button);
  });
}

async function handleAddFavorite() {
  const languageSelect = document.getElementById('languageSelect');
  const styleSelect = document.getElementById('styleSelect');
  
  if (!languageSelect || !styleSelect) return;
  
  const languageValue = languageSelect.value;
  const styleValue = styleSelect.value;
  
  if (!languageValue || !styleValue) {
    alert('Please select both language and style');
    return;
  }
  
  const languageLabel = getLanguageLabel(languageValue);
  const styleLabel = getStyleLabel(languageValue, styleValue);
  
  try {
    await storageManager.addFavorite({
      language: languageValue,
      languageLabel: languageLabel,
      style: styleValue,
      styleLabel: styleLabel
    });
    await updateFavoritesList();
  } catch (error) {
    alert(error.message);
  }
}

async function handleRemoveFavorite(language, style) {
  await storageManager.removeFavorite(language, style);
  await updateFavoritesList();
}

async function activateFavorite(favorite) {
  const languageSelect = document.getElementById('languageSelect');
  const styleSelect = document.getElementById('styleSelect');
  
  if (!languageSelect || !styleSelect) return;
  
  languageSelect.value = favorite.language;
  await handleLanguageChange({ target: { value: favorite.language } });
  styleSelect.value = favorite.style;
  await loadTranscriptionMap();
}
