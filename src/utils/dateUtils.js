function getWeekStatus(dateString, statusValue) {
  // If status is already "Done", return "Completed"
  if (statusValue === 'Done' || statusValue === 'done') {
    return 'Completed';
  }

  // If no date provided, return "Not Assigned"
  if (!dateString) {
    return 'Not Assigned';
  }

  const targetDate = new Date(dateString);
  const today = new Date();

  // Reset times to compare dates only
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  // Get current week's Monday and Sunday
  const currentWeekMonday = getMonday(today);
  const currentWeekSunday = getSunday(today);

  // Get next week's Monday and Sunday
  const nextWeekMonday = new Date(currentWeekMonday);
  nextWeekMonday.setDate(nextWeekMonday.getDate() + 7);
  const nextWeekSunday = new Date(currentWeekSunday);
  nextWeekSunday.setDate(nextWeekSunday.getDate() + 7);

  // Check which week the date falls into
  if (targetDate >= currentWeekMonday && targetDate <= currentWeekSunday) {
    return 'This Week';
  } else if (targetDate >= nextWeekMonday && targetDate <= nextWeekSunday) {
    return 'Next Week';
  } else if (targetDate > nextWeekSunday) {
    return 'Future';
  } else {
    // Date is in the past
    return 'Past Due';
  }
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSunday(date) {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// Format date for Monday.com status column update
function formatStatusForMonday(status) {
  // Monday.com status columns need specific format
  const statusMap = {
    'This Week': { label: 'This Week' },
    'Next Week': { label: 'Next Week' },
    'Future': { label: 'Future' },
    'Not Assigned': { label: 'Not Assigned' },
    'Completed': { label: 'Completed' },
    'Past Due': { label: 'Past Due' }
  };

  return statusMap[status] || { label: status };
}

module.exports = {
  getWeekStatus,
  formatStatusForMonday,
  getMonday,
  getSunday
};