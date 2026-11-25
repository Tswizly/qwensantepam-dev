const thisContact = contact;
const thisLineage = lineage;
const allReports = reports;

// Stock monitoring
const configs = require('./stock-monitoring.config.json');
const { getStockMonitoringSummaryCards } = require('@medic/cht-stock-monitoring-workflow');

// --- Translation Helper ---
const t = (key, params) => {
  if (typeof cht !== 'undefined' && cht.v1 && typeof cht.v1.translate === 'function') {
    return cht.v1.translate(key, params);
  }
  return key;
};

// --- Helper Functions ---

// Check for specific conditions in the report fields using translation keys
const getReportConditions = (report) => {
  const conditions = [];
  const fields = report.fields || {};
  const data = fields.data || {};
  const isPositive = (val) => val === 'yes' || val === 'true';
  const hasFlag = (...keys) => keys.some((k) => isPositive(fields[k]) || isPositive(data[k]));

  // Chronic conditions
  if (hasFlag('diabetes')) conditions.push({ key: 'condition.diabetes', type: 'chronic' });
  if (hasFlag('_result_hyperglycemia_mild')) conditions.push({ key: 'condition.hyperglycemia_mild', type: 'chronic' });
  if (hasFlag('_result_hyperglycemia_moderate')) conditions.push({ key: 'condition.hyperglycemia_moderate', type: 'chronic' });
  if (hasFlag('_result_hyperglycemia_severe')) conditions.push({ key: 'condition.hyperglycemia_severe', type: 'chronic' });

  if (hasFlag('stroke', '_result_stroke')) conditions.push({ key: 'condition.stroke', type: 'chronic' });
  if (hasFlag('_result_old_stroke')) conditions.push({ key: 'condition.old_stroke', type: 'chronic' });
  if (hasFlag('_result_transient_ischemic_attack')) conditions.push({ key: 'condition.transient_ischemic_attack', type: 'chronic' });

  if (hasFlag('hypertension')) conditions.push({ key: 'condition.hypertension', type: 'chronic' });
  if (hasFlag('_result_hypertension_grade_1')) conditions.push({ key: 'condition.hypertension_grade_1', type: 'chronic' });
  if (hasFlag('_result_hypertension_grade_2')) conditions.push({ key: 'condition.hypertension_grade_2', type: 'chronic' });
  if (hasFlag('_result_hypertension_grade_3')) conditions.push({ key: 'condition.hypertension_grade_3', type: 'chronic' });
  if (hasFlag('_result_hypertensive_urgency')) conditions.push({ key: 'condition.hypertensive_urgency', type: 'chronic' });
  if (hasFlag('_result_gestational_hypertension_no_serious')) conditions.push({ key: 'condition.gestational_hypertension_no_serious', type: 'chronic' });
  if (hasFlag('_result_gestational_hypertension_serious')) conditions.push({ key: 'condition.gestational_hypertension_serious', type: 'chronic' });
  if (hasFlag('_result_pre_eclampsia')) conditions.push({ key: 'condition.pre_eclampsia', type: 'chronic' });

  if (hasFlag('asthma', '_result_asthma')) conditions.push({ key: 'condition.asthma', type: 'chronic' });
  if (hasFlag('_result_tuberculosis')) conditions.push({ key: 'condition.tuberculosis', type: 'chronic' });

  // Other / Unclassified chronic condition (from CHD_Form007 / CHD_Form009_Summary)
  if (hasFlag('other_has_chronic_condition', '_chronic_condition_history')) {
    conditions.push({ key: 'condition.other_chronic_condition', type: 'chronic' });
  }

  // Temporary / Triage conditions
  if (hasFlag('_has_emergency_symptoms')) conditions.push({ key: 'condition.emergency_symptoms', type: 'temporary' });
  if (hasFlag('_emergency_dehydration')) conditions.push({ key: 'condition.emergency_dehydration', type: 'temporary' });
  if (hasFlag('_emergency_respiratory_distress')) conditions.push({ key: 'condition.emergency_respiratory_distress', type: 'temporary' });
  if (hasFlag('_emergency_altered_consciousness')) conditions.push({ key: 'condition.emergency_altered_consciousness', type: 'temporary' });
  if (hasFlag('_emergency_acute_malnutrition')) conditions.push({ key: 'condition.emergency_acute_malnutrition', type: 'temporary' });
  if (hasFlag('_emergency_bloated_extremities')) conditions.push({ key: 'condition.emergency_bloated_extremities', type: 'temporary' });

  if (hasFlag('_needs_vitamin_a')) conditions.push({ key: 'condition.needs_vitamin_a', type: 'temporary' });
  if (hasFlag('_needs_albendazole')) conditions.push({ key: 'condition.needs_albendazole', type: 'temporary' });

  // Respiratory conditions (including PSBI, Local Infection, and resp_result_* aliases)
  if (hasFlag('flu')) conditions.push({ key: 'condition.flu', type: 'temporary' });
  if (hasFlag('_result_flu_like_syndrome', 'resp_result_flu_syndrome')) conditions.push({ key: 'condition.flu_like_syndrome', type: 'temporary' });
  if (hasFlag('_result_pneumonia', 'resp_result_pneumonia')) conditions.push({ key: 'condition.pneumonia', type: 'temporary' });
  if (hasFlag('_result_severe_pneumonia', 'resp_result_severe_pneumonia')) conditions.push({ key: 'condition.severe_pneumonia', type: 'temporary' });
  if (hasFlag('_result_psbi', 'resp_result_psbi')) conditions.push({ key: 'condition.psbi', type: 'temporary' });
  if (hasFlag('_result_local_infection', 'resp_result_local_infection')) conditions.push({ key: 'condition.local_infection', type: 'temporary' });
  if (hasFlag('_result_pneumonia_pink')) conditions.push({ key: 'condition.pneumonia_pink', type: 'temporary' });
  if (hasFlag('_result_pneumonia_yellow')) conditions.push({ key: 'condition.pneumonia_yellow', type: 'temporary' });
  if (hasFlag('_result_tonsillitis', 'resp_result_tonsillitis')) conditions.push({ key: 'condition.tonsillitis', type: 'temporary' });
  if (hasFlag('_result_cough_or_cold', 'resp_result_cough_cold')) conditions.push({ key: 'condition.cough_or_cold', type: 'temporary' });
  if (hasFlag('_result_risk_malaria')) conditions.push({ key: 'condition.risk_malaria', type: 'temporary' });

  // Skin conditions
  if (hasFlag('skin_condition')) conditions.push({ key: 'condition.skin_condition', type: 'temporary' });
  if (hasFlag('impetigo', '_result_impetigo', '_result_impetigo_folliculitis')) conditions.push({ key: 'condition.impetigo', type: 'temporary' });
  if (hasFlag('scabies', '_result_scabies')) conditions.push({ key: 'condition.scabies', type: 'temporary' });
  if (hasFlag('ringworm', '_result_ring_worm')) conditions.push({ key: 'condition.ringworm', type: 'temporary' });

  // Anemia & malnutrition
  if (hasFlag('_result_anemia')) conditions.push({ key: 'condition.anemia', type: 'temporary' });
  if (hasFlag('_result_moderate_anemia')) conditions.push({ key: 'condition.moderate_anemia', type: 'temporary' });
  if (hasFlag('_result_severe_anemia')) conditions.push({ key: 'condition.severe_anemia', type: 'temporary' });
  if (hasFlag('_result_severe_malnutrition_anemia')) conditions.push({ key: 'condition.severe_malnutrition_anemia', type: 'temporary' });

  // Digestive conditions (including _calc_* and digestive_result_* aliases)
  if (hasFlag('_result_appendicitis_cholecystitis')) conditions.push({ key: 'condition.appendicitis_cholecystitis', type: 'temporary' });
  if (hasFlag('_result_gastritis', '_calc_gastritis', 'digestive_result_gastritis')) conditions.push({ key: 'condition.gastritis', type: 'temporary' });
  if (hasFlag('_result_gastritis_not_serious')) conditions.push({ key: 'condition.gastritis_not_serious', type: 'temporary' });
  if (hasFlag('_result_gastritis_serious')) conditions.push({ key: 'condition.gastritis_serious', type: 'temporary' });

  if (hasFlag('_result_acute_diarrhea')) conditions.push({ key: 'condition.acute_diarrhea', type: 'temporary' });
  if (hasFlag('_result_persistent_diarrhea', '_calc_persistent_diarrhea', 'digestive_result_persistent_diarrhea')) {
    conditions.push({ key: 'condition.persistent_diarrhea', type: 'temporary' });
  }
  if (hasFlag('_result_dysentery', '_calc_dysentery', 'digestive_result_dysentery')) {
    conditions.push({ key: 'condition.dysentery', type: 'temporary' });
  }
  if (
    hasFlag(
      '_result_severe_dehydration',
      '_calc_severe_dehydration',
      '_calc_infant_severe_dehydration',
      'digestive_result_severe_dehyd',
      '_result_some_dehydration',
      '_calc_some_dehydration',
      '_calc_infant_some_dehydration',
      'digestive_result_some_dehyd',
      '_result_dehydration'
    )
  ) {
    conditions.push({ key: 'condition.dehydration', type: 'temporary' });
  }
  if (hasFlag('_result_risk_of_cholera', '_result_cholera', '_calc_cholera', 'digestive_result_cholera')) {
    conditions.push({ key: 'condition.cholera', type: 'temporary' });
  }
  if (hasFlag('_result_amoeba_giardia')) conditions.push({ key: 'condition.amoeba_giardia', type: 'temporary' });

  // Genitourinary & pregnancy
  if (hasFlag('_result_genitourinary_infections')) conditions.push({ key: 'condition.genitourinary_infections', type: 'temporary' });
  if (hasFlag('_result_uti')) conditions.push({ key: 'condition.uti', type: 'temporary' });
  if (hasFlag('_result_glomerulonephritis')) conditions.push({ key: 'condition.glomerulonephritis', type: 'temporary' });
  if (hasFlag('_result_std_discharge')) conditions.push({ key: 'condition.std_discharge', type: 'temporary' });
  if (hasFlag('_result_std_ulcer')) conditions.push({ key: 'condition.std_ulcer', type: 'temporary' });
  if (hasFlag('_result_syphilis')) conditions.push({ key: 'condition.syphilis', type: 'temporary' });
  if (hasFlag('_result_other_std')) conditions.push({ key: 'condition.other_std', type: 'temporary' });
  if (hasFlag('_result_threatened_miscarriage_less20', '_result_threatened_miscarriage_greater20')) {
    conditions.push({ key: 'condition.threatened_miscarriage', type: 'temporary' });
  }

  // Vision Screening (from CHD_Form004 / CHD_Form009_Summary / ADT_Form010_Vision / ELD_Form010_Vision)
  if (hasFlag('_presbyopia_corrected')) {
    conditions.push({ key: 'condition.presbyopia_corrected', type: 'temporary' });
  }

  if (
    hasFlag('vision_screening_referral') ||
    fields._screening_result === 'refer' ||
    data._screening_result === 'refer'
  ) {
    conditions.push({ key: 'condition.vision_referral', type: 'temporary' });
  }

  // Wounds (from CHD_Form005 / CHD_Form009_Summary / ADT_Form011_Wounds / ELD_Form011_Wounds)
  const infectionSymptoms = fields._infection_symptoms || data._infection_symptoms || '';
  const bodyPart = fields._body_part || data._body_part || '';
  const isUrgentWound =
    hasFlag('wound_referral_needed', '_referral_needed') ||
    fields._severity_level === 'severe' ||
    data._severity_level === 'severe' ||
    fields._bleeding === 'active_heavy' ||
    data._bleeding === 'active_heavy';
  const hasWoundInfection =
    hasFlag('wound_infection_present') ||
    (infectionSymptoms !== '' && infectionSymptoms !== 'none');

  if (bodyPart !== '' && !isUrgentWound && !hasWoundInfection) {
    conditions.push({ key: 'condition.wound_care', type: 'temporary' });
  }

  if (isUrgentWound) {
    conditions.push({ key: 'condition.wound_referral', type: 'temporary' });
  }
  if (hasWoundInfection) {
    conditions.push({ key: 'condition.wound_infection', type: 'temporary' });
  }

  // Other / Unclassified severe symptoms (from CHD_Form007 / CHD_Form009_Summary / ADT_Form012_Other / ELD_Form013_Other)
  const symptomSeverity = fields._symptom_severity || data._symptom_severity || fields.other_symptom_severity || '';
  if (symptomSeverity === 'moderate') {
    conditions.push({ key: 'condition.other_moderate_symptoms', type: 'temporary' });
  }

  if (symptomSeverity === 'severe') {
    conditions.push({ key: 'condition.other_severe_symptoms', type: 'temporary' });
  }

  return conditions;
};

// Extract distributed drugs
const getDrugsDistributed = (fields) => {
  const drugs = {};
  const traverse = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key]);
      } else if (key.includes('total_') || key.includes('_distributed')) {
        const val = Number(obj[key]);
        if (!isNaN(val) && val > 0) {
          const rawKey = key
            .replace(/_?total_?/g, '')
            .replace(/_?data_?/g, '')
            .replace(/_?distributed_?/g, '')
            .replace(/_?sev_?/g, '')
            .replace(/_?preg_?/g, '')
            .replace(/_?scabies_?/g, '')
            .replace(/_?ringworm_?/g, '')
            .replace(/_?additional_?/g, '')
            .replace(/_?gt20_?/g, '')
            .trim();
          
          const drugItemKey = `cht-stock-monitoring-workflow.items.${rawKey}.label`;
          const translatedName = t(drugItemKey) !== drugItemKey ? t(drugItemKey) : rawKey.replace(/_/g, ' ');
          drugs[translatedName] = (drugs[translatedName] || 0) + val;
        }
      }
    }
  };
  traverse(fields);

  const drugList = Object.entries(drugs).map(([name, qty]) => `${name}: ${qty}`);
  return drugList.length > 0 ? drugList.join(', ') : t('contact_summary.none');
};

// --- Assessment History Card ---

const targetForms = [
  'ADT_Form014_Summary', 
  'ELD_Form012_Summary', 
  'YAA_Form009_Summary', 
  'CHD_Form009_Summary', 
];

const assessmentHistoryFields = allReports
  .filter(report => targetForms.includes(report.form))
  .sort((a, b) => b.reported_date - a.reported_date)
  .flatMap(report => {
    const dateStr = new Date(report.reported_date).toLocaleDateString();
    const conditionsFound = getReportConditions(report);
    const conditionsText = conditionsFound.length > 0 
      ? conditionsFound.map(c => t(c.key)).join(', ') 
      : t('contact_summary.none');
      
    const drugsText = getDrugsDistributed(report.fields || {});
    
    return [
      {
        label: t('contact_summary.assessment_on_date', { date: dateStr }),
        value: `${t('contact_summary.screened_positive_for')}: ${conditionsText}`,
        width: 12
      },
      {
        label: '',
        value: `${t('contact_summary.drugs_distributed')}: ${drugsText}`,
        width: 12
      }
    ];
  });

const assessmentHistoryCard = {
  label: 'contact_summary.assessment_history',
  appliesToType: 'person',
  fields: assessmentHistoryFields.length ? assessmentHistoryFields : [{ label: 'contact_summary.history', value: 'contact_summary.no_assessments_found', translate: true, width: 12 }]
};

// --- Current Conditions Card ---

const activeConditions = [];
const recentSet = new Set();
let hasChronic = false;
let hasRecent = false;

const chronicFields = [];

const hasChronicCondition = (contact, calcFieldName, conditionKeyword) => {
  const calcVal = contact[calcFieldName];
  if (calcVal === 'yes' || calcVal === 'true' || calcVal === true || calcVal === '1' || calcVal === 1) {
    return true;
  }
  const selectedConditions = contact.chronic_conditions || '';
  return typeof selectedConditions === 'string' && selectedConditions.includes(conditionKeyword);
};

if (hasChronicCondition(thisContact, 'chronic_hypertension', 'hypertension')) {
  chronicFields.push({ label: '', value: 'condition.hypertension', translate: true, width: 6 });
}
if (hasChronicCondition(thisContact, 'chronic_diabetes', 'diabetes')) {
  chronicFields.push({ label: '', value: 'condition.diabetes', translate: true, width: 6 });
}
if (hasChronicCondition(thisContact, 'chronic_stroke', 'previous_stroke')) {
  chronicFields.push({ label: '', value: 'condition.previous_stroke', translate: true, width: 6 });
}
if (hasChronicCondition(thisContact, 'chronic_asthma', 'asthma')) {
  chronicFields.push({ label: '', value: 'condition.asthma', translate: true, width: 6 });
}

if (chronicFields.length > 0) {
  hasChronic = true;
  activeConditions.push({ label: 'contact_summary.chronic_conditions', value: '', width: 12 });
  activeConditions.push(...chronicFields);
}

// 2. TEMPORARY (RECENT) CONDITIONS
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const now = new Date().getTime();
const recentFields = [];

[...allReports]
  .sort((a, b) => b.reported_date - a.reported_date)
  .forEach(report => {
    const reportTime = new Date(report.reported_date).getTime();
    const diffMs = now - reportTime;
    const conditions = getReportConditions(report);
    
    if (diffMs <= THIRTY_DAYS_MS) {
      conditions.forEach(cond => {
        if (!['condition.hypertension', 'condition.diabetes', 'condition.stroke', 'condition.asthma'].includes(cond.key) && !recentSet.has(cond.key)) {
          recentSet.add(cond.key);
          const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const dayString = daysAgo === 0 
            ? t('today') 
            : (daysAgo === 1 ? t('contact_summary.one_day_ago') : t('contact_summary.days_ago', { days: daysAgo }));
          
          recentFields.push({ 
            label: '', 
            value: `${t(cond.key)} (${t('contact_summary.screened')} ${dayString})`, 
            width: 6 
          });
        }
      });
    }
  });

if (recentFields.length > 0) {
  hasRecent = true;
  activeConditions.push({ label: 'contact_summary.recent_conditions', value: '', width: 12 });
  activeConditions.push(...recentFields);
}

const conditionsCard = {
  label: 'contact_summary.current_conditions',
  appliesToType: 'person',
  fields: (hasChronic || hasRecent) ? activeConditions : [{ label: 'contact_summary.status', value: 'contact_summary.no_active_conditions', translate: true, width: 12 }]
};

// --- Profile Fields ---

const fields = [
  { appliesToType: 'person', label: 'patient_id', value: thisContact.patient_id, width: 4 },
  { appliesToType: 'person', label: 'contact.age', value: thisContact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'contact.sex', value: 'contact.sex.' + thisContact.sex, translate: true, width: 4 },
  { appliesToType: 'person', label: 'person.field.phone', value: thisContact.phone, width: 4 },
  { appliesToType: 'person', label: 'contact.parent', value: thisLineage, filter: 'lineage' },
  { appliesToType: 'person', label: 'contact.role', value: thisContact.role, translate: true, width: 4 }
];

// --- Final Export ---

const cards = [
  assessmentHistoryCard,
  conditionsCard,
  ...getStockMonitoringSummaryCards(configs, allReports)
];

module.exports = {
  fields: fields,
  cards: cards,
  context: {}
};