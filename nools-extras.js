const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function isAlive(contact) {
  return contact && contact.contact && !contact.contact.date_of_death;
}

const TRIAGE_FORM_NAMES = ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'];

/**
 * Checks if a specific form was submitted during this specific triage encounter window.
 */
function isFormSubmittedInEncounter(contact, triageReport, nextTriageReportDate, formNames) {
  return (contact.reports || []).some(report => {
    const submittedAfterTriage = report.reported_date >= triageReport.reported_date;
    const submittedBeforeNextTriage = !nextTriageReportDate || report.reported_date < nextTriageReportDate;

    return submittedAfterTriage && submittedBeforeNextTriage && formNames.includes(report.form);
  });
}

// Helper to check encounter limits
function isLatestTriageEncounter(c, r) {
  const subsequentTriageReports = (c.reports || []).filter(report =>
    TRIAGE_FORM_NAMES.includes(report.form) &&
    report.reported_date > r.reported_date &&
    report._id !== r._id
  );
  return subsequentTriageReports.length === 0;
}

// Helper function to search across encounter forms for clinical calculation fields
function getEncounterFieldValue(encounterReports, fieldName, defaultValue = 'false') {
  for (const report of encounterReports) {
    if (!report.fields) continue;

    const cleanName = fieldName.startsWith('_') ? fieldName.substring(1) : fieldName;
    const prefixedName = fieldName.startsWith('_') ? fieldName : '_' + fieldName;

    if (report.fields[fieldName] !== undefined && report.fields[fieldName] !== '') return report.fields[fieldName];
    if (report.fields[cleanName] !== undefined && report.fields[cleanName] !== '') return report.fields[cleanName];
    if (report.fields[prefixedName] !== undefined && report.fields[prefixedName] !== '') return report.fields[prefixedName];

    if (report.fields.data) {
      if (report.fields.data[fieldName] !== undefined && report.fields.data[fieldName] !== '') return report.fields.data[fieldName];
      if (report.fields.data[cleanName] !== undefined && report.fields.data[cleanName] !== '') return report.fields.data[cleanName];
      if (report.fields.data[prefixedName] !== undefined && report.fields.data[prefixedName] !== '') return report.fields.data[prefixedName];
    }
  }
  return defaultValue;
}

// Robust check for contact's existing conditions
function hasConditionOnContact(c, calcField, keyword) {
  const contactDoc = (c && c.contact) || {};
  const val = contactDoc[calcField];
  if (val === 'yes' || val === 'true' || val === true || val === '1' || val === 1) return true;
  const raw = contactDoc.chronic_conditions || '';
  return typeof raw === 'string' && raw.includes(keyword);
}

module.exports = {
  getField,
  isAlive,
  TRIAGE_FORM_NAMES,
  isFormSubmittedInEncounter,
  isLatestTriageEncounter,
  getEncounterFieldValue,
  hasConditionOnContact
};