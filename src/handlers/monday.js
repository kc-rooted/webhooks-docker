const express = require('express');
const crypto = require('crypto');
const MondayClient = require('../utils/mondayClient');
const { getWeekStatus, formatStatusForMonday } = require('../utils/dateUtils');
const router = express.Router();

// Initialize Monday client - check if token is available
console.log('Initializing Monday client with token:', process.env.MONDAY_API_TOKEN ? 'Token present' : 'Token missing');
const mondayClient = new MondayClient(process.env.MONDAY_API_TOKEN);

router.post('/', async (req, res) => {
  try {
    const { challenge, event } = req.body;

    if (challenge) {
      console.log('Monday.com webhook challenge received');
      return res.status(200).json({ challenge });
    }

    console.log('Monday.com webhook received:', {
      eventType: event?.type,
      userId: event?.userId,
      boardId: event?.boardId,
      timestamp: new Date().toISOString()
    });

    switch (event?.type) {
      case 'create_item':
        await handleItemCreated(event);
        break;
      case 'update_column_value':
        await handleColumnUpdated(event);
        break;
      case 'create_update':
        await handleUpdateCreated(event);
        break;
      case 'change_status_column_value':
        await handleStatusChanged(event);
        break;
      default:
        console.log(`Unhandled Monday.com event type: ${event?.type}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing Monday.com webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

async function handleItemCreated(event) {
  console.log('Processing item creation:', {
    itemId: event.pulseId,
    itemName: event.pulseName,
    boardId: event.boardId
  });

  try {
    if (mondayClient.apiToken) {
      const item = await mondayClient.getItem(event.pulseId);
      console.log('Fetched created item details:', {
        id: item.id,
        name: item.name,
        board: item.board?.name
      });
    }
  } catch (error) {
    console.error('Error fetching item details:', error.message);
  }
}

async function handleColumnUpdated(event) {
  console.log('Processing column update:', {
    itemId: event.pulseId,
    columnId: event.columnId,
    value: event.value
  });

  // Check if the updated column is "Internal Deadline" by getting board info
  const isInternalDeadlineColumn = await checkIfInternalDeadlineColumn(event.boardId, event.columnId);

  if (isInternalDeadlineColumn) {
    console.log('Internal Deadline changed - updating Week Assigned status...');
    await updateWeekAssignedStatus(event);
  } else {
    console.log(`Column ${event.columnId} updated - not Internal Deadline, skipping Week Assigned update`);
  }
}

async function handleUpdateCreated(event) {
  console.log('Processing update creation:', {
    updateId: event.updateId,
    itemId: event.pulseId
  });
}

async function handleStatusChanged(event) {
  console.log('Processing status change:', {
    itemId: event.pulseId,
    columnId: event.columnId,
    previousValue: event.previousValue,
    value: event.value
  });
}

async function checkIfInternalDeadlineColumn(boardId, columnId) {
  try {
    const board = await mondayClient.getBoard(boardId);
    const column = board.columns?.find(col => col.id === columnId);
    return column?.title === 'Internal Deadline';
  } catch (error) {
    console.error('Error checking column title:', error.message);
    return false;
  }
}

async function updateWeekAssignedStatus(event) {
  try {
    console.log('Updating Week Assigned status for item:', event.pulseId);
    console.log('Monday client token available:', mondayClient.apiToken ? 'Yes' : 'No');

    // Get board info to find the Week Assigned column
    const board = await mondayClient.getBoard(event.boardId);
    const weekAssignedColumn = board.columns?.find(col => col.title === 'Week Assigned');

    if (!weekAssignedColumn) {
      console.log('No "Week Assigned" column found in this board, skipping update');
      return;
    }

    // Get the full item details to check the Status column
    const item = await mondayClient.getItem(event.pulseId);

    // Find the Status column value
    const statusColumn = item.column_values?.find(col => {
      const boardColumn = board.columns?.find(boardCol => boardCol.id === col.id);
      return boardColumn?.title === 'Status';
    });
    const statusValue = statusColumn?.text;

    // Extract the date from the event
    const dateValue = event.value?.date || event.value;

    // Calculate the week status
    const weekStatus = getWeekStatus(dateValue, statusValue);
    console.log(`Calculated week status: ${weekStatus} for date: ${dateValue}`);

    // Format the status for Monday.com
    const formattedStatus = formatStatusForMonday(weekStatus);

    // Update the "Week Assigned" column using the dynamically found column ID
    await mondayClient.updateColumnValue(
      event.boardId,
      event.pulseId,
      weekAssignedColumn.id,
      formattedStatus
    );

    console.log(`Successfully updated Week Assigned to: ${weekStatus}`);
  } catch (error) {
    console.error('Error updating Week Assigned status:', error.message);
  }
}

function verifyMondayWebhook(req) {
  const mondaySignature = req.get('Authorization');
  const secret = process.env.MONDAY_WEBHOOK_SECRET;

  if (!secret || !mondaySignature) {
    return false;
  }

  const body = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

  return hash === mondaySignature;
}

module.exports = router;