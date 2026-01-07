# Language Constants Maintenance Guide

## 🚀 How to Use the Script

### Check for Unused Translation Keys
```bash
npm run check-unused-constants
```
Shows which translation keys are not being used in the codebase without making any changes.

### Remove Unused Translation Keys
```bash
npm run check-unused-constants -- --cleanup
```
⚠️ **Warning**: Permanently removes unused keys from all language files. Backup first!

### Get Help
```bash
npm run check-unused-constants -- --help
```

## 📊 What You'll See

### When No Unused Keys Found:
```
✅ No unused keys found!

📊 SUMMARY:
Total Keys: 176
Used: 176
Unused: 0
```

### When Unused Keys Found:
```
🗑️ UNUSED KEYS:

🌐 EN files:
  📄 errors.json (2 unused):
     - OLD_ERROR_KEY
     - DEPRECATED_MESSAGE

🌐 HI files:
  📄 errors.json (1 unused):
     - UNUSED_HINDI_KEY

📊 SUMMARY:
Total Keys: 176
Used: 173
Unused: 3
Cleanup potential: 1.7%
```

## 🎯 Best Practices

1. **Run Before Releases**: Check for unused keys before deploying
2. **Backup First**: Always commit changes before running cleanup
3. **Multi-Language**: Add new keys to both English and Hindi files
4. **Regular Cleanup**: Run monthly to keep files clean

## 📁 Files Managed
- `src/i18n/en/errors.json` - English error messages
- `src/i18n/en/success.json` - English success messages  
- `src/i18n/hi/errors.json` - Hindi error messages
- `src/i18n/hi/success.json` - Hindi success messages

---
**Script Location**: `scripts/check-unused-language-constants.js`
