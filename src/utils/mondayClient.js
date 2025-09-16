const https = require('https');

class MondayClient {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.apiUrl = 'https://api.monday.com/v2';
  }

  async query(queryString, variables = {}) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        query: queryString,
        variables
      });

      const options = {
        hostname: 'api.monday.com',
        path: '/v2',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.errors) {
              reject(new Error(`Monday API Error: ${JSON.stringify(response.errors)}`));
            } else {
              resolve(response.data);
            }
          } catch (error) {
            reject(new Error(`Failed to parse Monday API response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Monday API Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async getItem(itemId) {
    const query = `
      query($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          board {
            id
            name
          }
          group {
            id
            title
          }
          column_values {
            id
            value
            text
          }
        }
      }
    `;

    const result = await this.query(query, { itemId: parseInt(itemId) });
    return result.items?.[0];
  }

  async updateColumnValue(boardId, itemId, columnId, value) {
    const mutation = `
      mutation($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(
          board_id: $boardId,
          item_id: $itemId,
          column_id: $columnId,
          value: $value
        ) {
          id
        }
      }
    `;

    return await this.query(mutation, {
      boardId: parseInt(boardId),
      itemId: parseInt(itemId),
      columnId,
      value: JSON.stringify(value)
    });
  }

  async createItem(boardId, itemName, columnValues = {}) {
    const mutation = `
      mutation($boardId: ID!, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    return await this.query(mutation, {
      boardId: parseInt(boardId),
      itemName,
      columnValues: JSON.stringify(columnValues)
    });
  }

  async createUpdate(itemId, body) {
    const mutation = `
      mutation($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `;

    return await this.query(mutation, {
      itemId: parseInt(itemId),
      body
    });
  }

  async getBoard(boardId) {
    const query = `
      query($boardId: ID!) {
        boards(ids: [$boardId]) {
          id
          name
          description
          columns {
            id
            title
            type
          }
          groups {
            id
            title
          }
        }
      }
    `;

    const result = await this.query(query, { boardId: parseInt(boardId) });
    return result.boards?.[0];
  }
}

module.exports = MondayClient;