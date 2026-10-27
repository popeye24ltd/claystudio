const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');
// Mock environment
global.window = { clientBookings: [], clientGallery: [], isGalleryReleased: false };
global.document = { querySelector: () => null, getElementById: () => null, addEventListener: () => null };
global.localStorage = { getItem: () => null };
global.firebase = { firestore: { FieldValue: {} } };
const fakeUser = { name: 'Test', role: 'client' };
// Inject code
eval(code);
currentUserProfile = fakeUser;
try {
    const html = routes['client-dashboard']();
    console.log('SUCCESS, length:', html.length);
} catch(e) {
    console.error('ERROR:', e);
}
