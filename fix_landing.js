const fs = require('fs');
const path = '/tmp/cc-agent/48005361/project/src/pages/LandingPage.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Keep lines 1-1251 (everything before navigation)
const before = lines.slice(0, 1251).join('\n');

// Skip lines 1252-1984 (navigation sections) 

// Keep lines 1986 onwards (main content), but fix the padding
const after = lines.slice(1986).join('\n');

// Fix the main content div to remove left margin and adjust top padding
const fixedAfter = after.replace(
  '<div className="ml-15">',
  '<div>'
).replace(
  'className={`ml-16 px-6 transition-all duration-300 ${showCategories ? \'pt-56\' : \'pt-32\'}`}',
  'className={`px-6 transition-all duration-300 pt-8`}'
);

const newContent = before + '\n' + fixedAfter;
fs.writeFileSync(path, newContent, 'utf8');
console.log('Fixed LandingPage.tsx - removed navigation sections');
