const MondayClient = require('../utils/mondayClient');
const { getWeekStatus, formatStatusForMonday } = require('../utils/dateUtils');

class WeekAssignedUpdater {
  constructor() {
    this.mondayClient = new MondayClient(process.env.MONDAY_API_TOKEN);
    this.boardIds = process.env.MONDAY_BOARD_IDS
      ? process.env.MONDAY_BOARD_IDS.split(',').map(id => id.trim())
      : [];
  }

  async updateAllBoards() {
    const startTime = new Date();
    console.log(`[${startTime.toISOString()}] Starting scheduled Week Assigned update for ${this.boardIds.length} boards`);

    const results = {
      successful: 0,
      failed: 0,
      errors: [],
      boardSummaries: []
    };

    for (const boardId of this.boardIds) {
      try {
        const boardResult = await this.updateBoard(boardId);
        results.boardSummaries.push(boardResult);
        if (boardResult.success) {
          results.successful++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to process board ${boardId}:`, error.message);
        results.failed++;
        results.errors.push({
          boardId,
          error: error.message
        });
      }
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    console.log(`[${endTime.toISOString()}] Scheduled update completed in ${duration}s`);
    console.log(`Results: ${results.successful} boards succeeded, ${results.failed} boards failed`);

    if (results.errors.length > 0) {
      console.error('Errors encountered:', results.errors);
    }

    return results;
  }

  async updateBoard(boardId) {
    console.log(`Processing board ${boardId}...`);

    try {
      // Get board details with columns
      const board = await this.mondayClient.getBoard(boardId);

      if (!board) {
        throw new Error(`Board ${boardId} not found`);
      }

      // Check for required columns
      const internalDeadlineColumn = board.columns?.find(col => col.title === 'Internal Deadline');
      const weekAssignedColumn = board.columns?.find(col => col.title === 'Week Assigned');
      const statusColumn = board.columns?.find(col => col.title === 'Status');

      // Log missing columns but continue processing
      const missingColumns = [];
      if (!internalDeadlineColumn) missingColumns.push('Internal Deadline');
      if (!weekAssignedColumn) missingColumns.push('Week Assigned');
      if (!statusColumn) missingColumns.push('Status');

      if (missingColumns.length > 0) {
        console.warn(`Board ${boardId} (${board.name}) is missing columns: ${missingColumns.join(', ')}`);

        // If Week Assigned column is missing, we can't update anything
        if (!weekAssignedColumn) {
          return {
            boardId,
            boardName: board.name,
            success: false,
            reason: 'Missing Week Assigned column',
            missingColumns
          };
        }
      }

      // Get all items in the board (excluding Done items if possible)
      const items = await this.getAllBoardItems(boardId, statusColumn?.id);
      console.log(`Found ${items.length} active items in board ${board.name} (excluding Done status)`);

      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const item of items) {
        try {
          const updateResult = await this.updateItemWeekAssigned(
            item,
            board,
            internalDeadlineColumn,
            weekAssignedColumn,
            statusColumn
          );

          if (updateResult.updated) {
            updatedCount++;
          } else if (updateResult.skipped) {
            skippedCount++;
          }
        } catch (error) {
          console.error(`Error updating item ${item.id} (${item.name}):`, error.message);
          errorCount++;
        }
      }

      console.log(`Board ${board.name}: Updated ${updatedCount}, Skipped ${skippedCount}, Errors ${errorCount}`);

      return {
        boardId,
        boardName: board.name,
        success: true,
        totalItems: items.length,
        updatedItems: updatedCount,
        skippedItems: skippedCount,
        errorItems: errorCount,
        missingColumns: missingColumns.length > 0 ? missingColumns : undefined
      };

    } catch (error) {
      console.error(`Error processing board ${boardId}:`, error);
      return {
        boardId,
        success: false,
        error: error.message
      };
    }
  }

  async getAllBoardItems(boardId, statusColumnId) {
    // If we have a status column ID, use it to filter out "Done" items at the API level
    if (statusColumnId) {
      const query = `
        query($boardId: ID!, $queryParams: ItemsQuery) {
          boards(ids: [$boardId]) {
            items_page(limit: 500, query_params: $queryParams) {
              items {
                id
                name
                column_values {
                  id
                  value
                  text
                  type
                }
              }
            }
          }
        }
      `;

      // Build query parameters to exclude "Done" status
      const queryParams = {
        rules: [
          {
            column_id: statusColumnId,
            compare_value: ["Done"],
            operator: "not_any_of"
          }
        ],
        operator: "and"
      };

      try {
        const result = await this.mondayClient.query(query, {
          boardId: parseInt(boardId),
          queryParams: queryParams
        });
        return result.boards?.[0]?.items_page?.items || [];
      } catch (error) {
        console.warn(`Failed to filter by status, fetching all items: ${error.message}`);
        // Fall back to fetching all items if filter fails
      }
    }

    // Fallback: Get all items without filtering
    const query = `
      query($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values {
                id
                value
                text
                type
              }
            }
          }
        }
      }
    `;

    const result = await this.mondayClient.query(query, { boardId: parseInt(boardId) });
    return result.boards?.[0]?.items_page?.items || [];
  }

  async updateItemWeekAssigned(item, board, internalDeadlineCol, weekAssignedCol, statusCol) {
    // If no Week Assigned column, skip
    if (!weekAssignedCol) {
      return { skipped: true, reason: 'No Week Assigned column' };
    }

    // Get current column values
    let dateValue = null;
    let statusValue = null;
    let currentWeekAssigned = null;

    // Find Internal Deadline value
    if (internalDeadlineCol) {
      const deadlineColumn = item.column_values?.find(col => col.id === internalDeadlineCol.id);
      if (deadlineColumn?.value) {
        try {
          const parsed = JSON.parse(deadlineColumn.value);
          dateValue = parsed.date;
        } catch (e) {
          // Value might be null or invalid JSON
          dateValue = null;
        }
      }
    }

    // Find Status value
    if (statusCol) {
      const statusColumn = item.column_values?.find(col => col.id === statusCol.id);
      statusValue = statusColumn?.text;
    }

    // Skip items with status "Done" - they don't need updates
    if (statusValue === 'Done' || statusValue === 'done') {
      return { skipped: true, reason: 'Status is Done' };
    }

    // Find current Week Assigned value
    const weekAssignedColumn = item.column_values?.find(col => col.id === weekAssignedCol.id);
    currentWeekAssigned = weekAssignedColumn?.text;

    // Calculate new week status
    const newWeekStatus = getWeekStatus(dateValue, statusValue);

    // Skip if the status hasn't changed
    if (currentWeekAssigned === newWeekStatus) {
      return { skipped: true, reason: 'Status unchanged' };
    }

    // Format and update
    const formattedStatus = formatStatusForMonday(newWeekStatus);

    console.log(`Updating item ${item.id} (${item.name}): "${currentWeekAssigned || 'Not set'}" → "${newWeekStatus}"`);

    await this.mondayClient.updateColumnValue(
      board.id,
      item.id,
      weekAssignedCol.id,
      formattedStatus
    );

    return {
      updated: true,
      previousValue: currentWeekAssigned,
      newValue: newWeekStatus
    };
  }

  // Manual trigger for testing
  async runManually() {
    console.log('Manually triggering Week Assigned update...');
    return await this.updateAllBoards();
  }
}

module.exports = WeekAssignedUpdater;