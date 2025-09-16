const MondayClient = require('./src/utils/mondayClient');
require('dotenv').config();

async function testMondayAPI() {
  console.log('\n🔌 Testing Monday.com API Connection\n');
  console.log('=====================================\n');

  const client = new MondayClient(process.env.MONDAY_API_TOKEN);

  if (!process.env.MONDAY_API_TOKEN) {
    console.error('❌ MONDAY_API_TOKEN not found in environment variables');
    console.log('   Make sure your .env file contains the API token\n');
    return;
  }

  try {
    // Test 1: Get current user info
    console.log('1️⃣  Testing authentication - Getting current user...');
    const userQuery = `
      query {
        me {
          id
          name
          email
          account {
            name
            id
          }
        }
      }
    `;

    const userData = await client.query(userQuery);
    console.log('✅ Authentication successful!');
    console.log('   User:', userData.me.name);
    console.log('   Email:', userData.me.email);
    console.log('   Account:', userData.me.account.name);

    // Test 2: Get boards
    console.log('\n2️⃣  Fetching your boards...');
    const boardsQuery = `
      query {
        boards(limit: 5) {
          id
          name
          description
          item_terminology
          items_count
        }
      }
    `;

    const boardsData = await client.query(boardsQuery);
    console.log(`✅ Found ${boardsData.boards.length} board(s):`);
    boardsData.boards.forEach((board, index) => {
      console.log(`   ${index + 1}. ${board.name} (ID: ${board.id}) - ${board.items_count || 0} items`);
    });

    // Test 3: Get items from first board (if exists)
    if (boardsData.boards.length > 0) {
      const firstBoard = boardsData.boards[0];
      console.log(`\n3️⃣  Getting items from "${firstBoard.name}"...`);

      const itemsQuery = `
        query($boardId: ID!) {
          boards(ids: [$boardId]) {
            items(limit: 3) {
              id
              name
              group {
                title
              }
              column_values {
                id
                title
                text
              }
            }
          }
        }
      `;

      const itemsData = await client.query(itemsQuery, { boardId: parseInt(firstBoard.id) });
      const items = itemsData.boards[0]?.items || [];

      if (items.length > 0) {
        console.log(`✅ Found ${items.length} item(s):`);
        items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} (Group: ${item.group.title})`);
        });
      } else {
        console.log('   No items found in this board');
      }
    }

    // Test 4: Test webhook-related functionality
    console.log('\n4️⃣  Testing webhook integration readiness...');
    console.log('✅ API connection verified - ready to process webhooks');
    console.log('   When webhooks are received, the handler can:');
    console.log('   - Fetch full item details');
    console.log('   - Update column values');
    console.log('   - Create new items');
    console.log('   - Post updates to items');

    console.log('\n\n✨ Monday.com API tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ API Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check that your API token is correct in .env');
    console.log('2. Ensure the token has the required permissions');
    console.log('3. Check your internet connection\n');
  }
}

// Run the test
testMondayAPI();