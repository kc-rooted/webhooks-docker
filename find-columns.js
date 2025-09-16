const MondayClient = require('./src/utils/mondayClient');
require('dotenv').config();

async function findColumns() {
  const client = new MondayClient(process.env.MONDAY_API_TOKEN);

  console.log('\n🔍 Finding Column IDs in Your Monday Board\n');
  console.log('==========================================\n');

  try {
    // Get boards
    const boardsQuery = `
      query {
        boards(limit: 10) {
          id
          name
          columns {
            id
            title
            type
          }
        }
      }
    `;

    const boardsData = await client.query(boardsQuery);

    boardsData.boards.forEach(board => {
      console.log(`\n📋 Board: ${board.name} (ID: ${board.id})`);
      console.log('Columns:');

      board.columns.forEach(column => {
        // Highlight the important columns
        let marker = '';
        if (column.title.toLowerCase().includes('internal deadline')) {
          marker = ' ⭐ (Internal Deadline)';
        } else if (column.title.toLowerCase().includes('week assigned')) {
          marker = ' 🎯 (Week Assigned - UPDATE THIS!)';
        } else if (column.title.toLowerCase() === 'status') {
          marker = ' ✅ (Status)';
        }

        console.log(`  - ${column.title}: id="${column.id}", type="${column.type}"${marker}`);
      });
    });

    console.log('\n\n💡 ACTION REQUIRED:');
    console.log('==================');
    console.log('1. Find the "Week Assigned" column ID above (marked with 🎯)');
    console.log('2. Update line 131 in src/handlers/monday.js:');
    console.log('   const weekAssignedColumnId = "YOUR_COLUMN_ID_HERE";');
    console.log('\n3. The webhook will then automatically update Week Assigned when Internal Deadline changes!\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findColumns();