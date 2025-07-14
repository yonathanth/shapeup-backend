# 🔐 Password Fix Script

This script identifies and fixes users who have unhashed passwords in the database, which prevents them from logging in properly.

## 🎯 Problem

Some users were created with plain text passwords (like "mf1234") instead of properly hashed passwords. This causes login failures because:

- Registration/Login controllers expect bcrypt-hashed passwords
- Plain text passwords can't be verified with `bcrypt.compare()`

## 🛠️ Solution

This script:

1. **Audits** all users to identify unhashed passwords
2. **Hashes** plain text passwords using `bcrypt.hash(password, 10)`
3. **Updates** the database with properly hashed passwords
4. **Verifies** that all passwords are now correctly hashed

## 📋 Usage

### 1. Navigate to the scripts directory

```bash
cd shapeup-backend/scripts
```

### 2. Run the script (choose one option):

#### Option A: Full Fix (Recommended)

```bash
node fix-unhashed-passwords.js
```

This will:

- Show all users and their password status
- Fix unhashed passwords
- Verify the fix was successful

#### Option B: Verification Only (Safe)

```bash
node fix-unhashed-passwords.js --verify-only
```

This will:

- Only check current password state
- Show which users need fixing (without modifying anything)

#### Option C: Help

```bash
node fix-unhashed-passwords.js --help
```

## 📊 Expected Output

### Before Fix:

```
🔍 Starting password audit and fix...

📊 Total users found: 15

🔎 Identifying users with unhashed passwords...

❌ UNHASHED: John Doe (0912345678) - Password: "mf1234"
❌ UNHASHED: Jane Smith (0987654321) - Password: "mf1234"
✅ HASHED: Mike Johnson (0911111111) - Password: [HASHED]

📈 Summary:
   • Users with hashed passwords: 13
   • Users with unhashed passwords: 2

🔧 Fixing 2 users with unhashed passwords...

🔒 Hashing password for: John Doe (0912345678)
   ✅ Fixed: John Doe - Password successfully hashed
🔒 Hashing password for: Jane Smith (0987654321)
   ✅ Fixed: Jane Smith - Password successfully hashed

🎯 Final Results:
   • Successfully fixed: 2 users
   • Errors encountered: 0 users
   • Total processed: 2 users

🎉 Password fix completed! All users should now be able to login properly.
```

### After Fix:

```
✅ VERIFICATION PASSED: All passwords are properly hashed!
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running this script
2. **Test Environment**: Run on staging/test environment first
3. **User Impact**: Users can still login with their original passwords (like "mf1234")
4. **One-Time**: This script only needs to be run once per database

## 🔧 What Gets Fixed

| Before Fix      | After Fix         | User Login                  |
| --------------- | ----------------- | --------------------------- |
| `"mf1234"`      | `"$2a$10$xyz..."` | ✅ Works with "mf1234"      |
| `"password123"` | `"$2a$10$abc..."` | ✅ Works with "password123" |
| Already hashed  | No change         | ✅ Works normally           |

## 🆘 Troubleshooting

### If script fails:

1. Check database connection
2. Ensure Prisma is properly configured
3. Verify bcryptjs is installed: `npm install bcryptjs`

### If users still can't login after fix:

1. Run verification: `node fix-unhashed-passwords.js --verify-only`
2. Check if passwords were actually hashed
3. Verify user is using correct password

## 🎉 Success Indicators

After running the script successfully:

- All users should show "✅ HASHED" status
- Verification should show "VERIFICATION PASSED"
- Users with "mf1234" password can now login properly
- No more 413 authentication errors for affected users
