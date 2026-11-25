const configs = require('./stock-monitoring.config.json');
const { getStockMonitoringTasks } = require('@medic/cht-stock-monitoring-workflow');
const {
  TRIAGE_FORM_NAMES,
  isFormSubmittedInEncounter,
  isLatestTriageEncounter,
  getEncounterFieldValue,
  hasConditionOnContact
} = require('./nools-extras');

// Mapping of route flags in triage forms to Adult follow-up form names
const ADULT_ROUTE_FORM_MAPPING = {
  route_digestive: ['ADT_Form002_DigestiveConditions'],
  route_fever: ['ADT_Form003_Fever'],
  route_hypertension: ['ADT_Form004_Hypertension'],
  route_pregnancy: ['ADT_Form005_Pregnancy'],
  route_respiratory: ['ADT_Form006_RespiratoryConditions'],
  route_skin: ['ADT_Form007_SkinConditions'],
  route_stroke: ['ADT_Form008_Stroke'],
  route_uti_std: ['ADT_Form009_UTIandSTD'], 
  route_wound: ['ADT_Form011_Wounds'],
  route_vision: ['ADT_Form010_Vision'],
  route_diabetes: ['ADT_Form001_Diabetes'],
  route_other: ['ADT_Form012_Other'],
  route_anemia: ['ADT_Form013_Anemia']
};

// Mapping of route flags in triage forms to Elderly follow-up form names
const ELDERLY_ROUTE_FORM_MAPPING = {
  route_digestive: ['ADT_Form002_DigestiveConditions'],
  route_fever: ['ADT_Form003_Fever'],
  route_hypertension: ['ADT_Form004_Hypertension'],
  route_respiratory: ['ELD_Form006_RespiratoryConditions'], // Overridden
  route_skin: ['ADT_Form007_SkinConditions'],
  route_stroke: ['ADT_Form008_Stroke'],
  route_uti_std: ['ELD_Form009_UTIandSTD'], // Overridden
  route_wound: ['ELD_Form011_Wounds'], // Overridden
  route_vision: ['ELD_Form010_Vision'], // Overridden
  route_diabetes: ['ADT_Form001_Diabetes'],
  route_other: ['ELD_Form013_Other'], // Elderly specific
  route_anemia: ['ADT_Form013_Anemia'],
  route_chronic_pain: ['ELD_Form001_ChronicPain'] // Elderly specific
};

// Mapping of route flags in triage forms to Child follow-up form names
const CHILDREN_ROUTE_FORM_MAPPING = {
  route_anemia_malnutrition: ['CHD_Form008_Malnutrition_Anemia'],
  route_digestive: ['CHD_Form001_DigestiveConditions'],
  route_respiratory: ['CHD_Form002_RespiratoryInfections'],
  route_skin: ['CHD_Form003_SkinConditions'],
  route_vision: ['CHD_Form004_Vision'],
  route_wound: ['CHD_Form005_Wounds'],
  route_other: ['CHD_Form007_Other'],
};

// Mapping of route flags in triage forms to Youth/Adolescent follow-up form names
const YOUTH_ROUTE_FORM_MAPPING = {
  route_anemia: ['YAA_Form008_Malnutrition_Anemia'],
  route_digestive: ['YAA_Form001_DigestiveConditions'],
  route_respiratory: ['YAA_Form002_RespiratoryConditions'],
  route_skin: ['YAA_Form003_SkinConditions'],
  route_uti_std: ['YAA_Form004_UTIandSTD'],
  route_wound: ['YAA_Form006_Wounds'],
  route_vision: ['YAA_Form005_Vision'],
  route_pregnancy: ['ADT_Form005_Pregnancy'],
  route_other: ['YAA_Form007_Other']
};

const SUMMARY_FORM_NAMES = ['CHD_Form009_Summary', 'ADT_Form014_Summary', 'ELD_Form012_Summary', 'YAA_Form009_Summary'];

module.exports = [
  ...getStockMonitoringTasks(configs),

  // Person edit prompting task
  {
    name: 'update-patient-chronic-conditions',
    title: 'task.update_chronic_conditions.title',
    icon: 'icon-person-edit',
    appliesTo: 'reports',
    appliesToType: SUMMARY_FORM_NAMES,
    appliesIf: function(c, r) {
      const fields = r.fields || {};

      // 1. Hypertension Check
      const hasHypertension = [
        fields._result_hypertension_grade_1,
        fields._result_hypertension_grade_2,
        fields._result_hypertension_grade_3,
        fields._result_hypertensive_urgency,
        fields._result_hypertension
      ].includes('true');
      const missingHypertension = hasHypertension && !hasConditionOnContact(c, 'chronic_hypertension', 'hypertension');

      // 2. Diabetes Check
      const hasDiabetes = [
        fields._result_hyperglycemia_mild,
        fields._result_hyperglycemia_moderate,
        fields._result_hyperglycemia_severe,
        fields._result_diabetes
      ].includes('true');
      const missingDiabetes = hasDiabetes && !hasConditionOnContact(c, 'chronic_diabetes', 'diabetes');

      // 3. Previous Stroke Check
      const hasStroke = [
        fields._result_stroke,
        fields._result_old_stroke,
        fields._result_transient_ischemic_attack,
        fields._result_previous_stroke
      ].includes('true');
      const missingStroke = hasStroke && !hasConditionOnContact(c, 'chronic_stroke', 'previous_stroke');

      // 4. Asthma Check
      const hasAsthma = [
        fields._result_asthma,
        fields._result_chronic_asthma
      ].includes('true');
      const missingAsthma = hasAsthma && !hasConditionOnContact(c, 'chronic_asthma', 'asthma');

      // Applies if ANY of the conditions are newly detected and not yet recorded on the contact
      return missingHypertension || missingDiabetes || missingStroke || missingAsthma;
    },
    actions: [
      {
        form: 'GEN_Form004_EditPersonPrompt',
        modifyContent: function(content, c, r) {
          const fields = r.fields || {};
          const missing = [];

          if (
            [
              fields._result_hypertension_grade_1,
              fields._result_hypertension_grade_2,
              fields._result_hypertension_grade_3,
              fields._result_hypertensive_urgency,
              fields._result_hypertension
            ].includes('true') &&
            !hasConditionOnContact(c, 'chronic_hypertension', 'hypertension')
          ) {
            missing.push('Chronic Hypertension');
          }

          if (
            [
              fields._result_hyperglycemia_mild,
              fields._result_hyperglycemia_moderate,
              fields._result_hyperglycemia_severe,
              fields._result_diabetes
            ].includes('true') &&
            !hasConditionOnContact(c, 'chronic_diabetes', 'diabetes')
          ) {
            missing.push('Chronic Diabetes');
          }

          if (
            [
              fields._result_stroke,
              fields._result_old_stroke,
              fields._result_transient_ischemic_attack,
              fields._result_previous_stroke
            ].includes('true') &&
            !hasConditionOnContact(c, 'chronic_stroke', 'previous_stroke')
          ) {
            missing.push('Chronic Stroke');
          }

          if (
            [
              fields._result_asthma,
              fields._result_chronic_asthma
            ].includes('true') &&
            !hasConditionOnContact(c, 'chronic_asthma', 'asthma')
          ) {
            missing.push('Chronic Asthma');
          }

          content.new_conditions_detected = missing.join(', ');
        }
      }
    ],
    events: [{ start: 0, days: 0, end: 1 }]
  },
  
  // ----------------------------------------------------
  // ROUTE SUMMARY FORM - CHILDREN (0-5)
  // ----------------------------------------------------
  {
    name: 'triage_final_summary_children',
    title: 'task.triage_final_summary_children.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: TRIAGE_FORM_NAMES,

    appliesIf: function(c, r) {
      if (c.contact && c.contact.muted) return false;
      if (!r.fields || r.fields.patient_age_in_years > 5) return false;
      if (!isLatestTriageEncounter(c, r)) return false;

      const summaryAlreadySubmitted = (c.reports || []).some(report =>
        report.reported_date >= r.reported_date && report.form === 'CHD_Form009_Summary'
      );
      if (summaryAlreadySubmitted) return false;

      const requiredFormGroups = [];
      Object.keys(CHILDREN_ROUTE_FORM_MAPPING).forEach(routeKey => {
        const isAnemiaRoute =
          routeKey === 'route_anemia_malnutrition' &&
          r.fields &&
          (r.fields.route_anemia_malnutrition === 'true' || r.fields.route_malnutrition_anemia === 'true');

        if (r.fields && (r.fields[routeKey] === 'true' || isAnemiaRoute)) {
          requiredFormGroups.push(CHILDREN_ROUTE_FORM_MAPPING[routeKey]);
        }
      });

      // Check if patient was flagged for emergency symptoms in the triage form
      if (r.fields && (r.fields._has_emergency_symptoms === 'true' || r.fields.has_emergency_symptoms === 'yes')) {
        return true;
      }

      if (requiredFormGroups.length === 0) return true;

      return requiredFormGroups.every(formNames =>
        isFormSubmittedInEncounter(c, r, null, formNames)
      );
    },

    actions: [
      {
        form: 'CHD_Form009_Summary',
        modifyContent: function(content, c, r) {
          // Forward contact hierarchy
          const contactDoc = c.contact || c;
          content.contact = contactDoc;
          if (contactDoc.parent && contactDoc.parent._id) {
            content.clinic_id = contactDoc.parent._id;
          }

          const encounterReports = (c.reports || []).filter(report => report.reported_date >= r.reported_date);

          // Emergency Symptoms Mapping
          content._has_emergency_symptoms = getEncounterFieldValue(encounterReports, '_has_emergency_symptoms');
          content._emergency_dehydration = getEncounterFieldValue(encounterReports, '_emergency_dehydration');
          content._emergency_respiratory_distress = getEncounterFieldValue(encounterReports, '_emergency_respiratory_distress');
          content._emergency_altered_consciousness = getEncounterFieldValue(encounterReports, '_emergency_altered_consciousness');
          content._emergency_acute_malnutrition = getEncounterFieldValue(encounterReports, '_emergency_acute_malnutrition');
          content._emergency_bloated_extremities = getEncounterFieldValue(encounterReports, '_emergency_bloated_extremities');

          // Anthropometrics from Triage (for weight-based medication dosing)
          content._child_weight = getEncounterFieldValue(encounterReports, 'weight', '');
          content._child_height = getEncounterFieldValue(encounterReports, 'height', '');

          // Preventive Care Mapping
          content._needs_vitamin_a = getEncounterFieldValue(encounterReports, '_needs_vitamin_a');
          content._needs_albendazole = getEncounterFieldValue(encounterReports, '_needs_albendazole');
          content._vaccinated_as_expected = getEncounterFieldValue(encounterReports, '_vaccinated_as_expected');

          // Respiratory Infections (from CHD_Form002)
          content._result_severe_pneumonia = getEncounterFieldValue(encounterReports, '_result_severe_pneumonia');
          content._result_psbi = getEncounterFieldValue(encounterReports, '_result_psbi');
          content._result_local_infection = getEncounterFieldValue(encounterReports, '_result_local_infection');
          content._result_pneumonia = getEncounterFieldValue(encounterReports, '_result_pneumonia');
          content._result_cough_or_cold = getEncounterFieldValue(encounterReports, '_result_cough_or_cold');
          content._result_tonsillitis = getEncounterFieldValue(encounterReports, '_result_tonsillitis');
          content._result_flu_like_syndrome = getEncounterFieldValue(encounterReports, '_result_flu_like_syndrome');
          content._fast_breathing = getEncounterFieldValue(encounterReports, '_fast_breathing');
          content._nebulizer_used = getEncounterFieldValue(encounterReports, '_nebulizer_used');

          // Digestive Conditions (from CHD_Form001 - including < 2 months infant fields)
          content._result_severe_dehydration = getEncounterFieldValue(encounterReports, '_calc_severe_dehydration');
          content._calc_severe_dehydration = getEncounterFieldValue(encounterReports, '_calc_severe_dehydration');
          content._calc_infant_severe_dehydration = getEncounterFieldValue(encounterReports, '_calc_infant_severe_dehydration');

          content._result_some_dehydration = getEncounterFieldValue(encounterReports, '_calc_some_dehydration');
          content._calc_some_dehydration = getEncounterFieldValue(encounterReports, '_calc_some_dehydration');
          content._calc_infant_some_dehydration = getEncounterFieldValue(encounterReports, '_calc_infant_some_dehydration');

          content._result_no_dehydration = getEncounterFieldValue(encounterReports, '_calc_no_dehydration');
          content._calc_no_dehydration = getEncounterFieldValue(encounterReports, '_calc_no_dehydration');
          content._calc_infant_no_dehydration = getEncounterFieldValue(encounterReports, '_calc_infant_no_dehydration');

          content._result_persistent_diarrhea = getEncounterFieldValue(encounterReports, '_calc_persistent_diarrhea');
          content._calc_persistent_diarrhea = getEncounterFieldValue(encounterReports, '_calc_persistent_diarrhea');

          content._result_dysentery = getEncounterFieldValue(encounterReports, '_calc_dysentery');
          content._calc_dysentery = getEncounterFieldValue(encounterReports, '_calc_dysentery');

          content._result_gastritis = getEncounterFieldValue(encounterReports, '_calc_gastritis');
          content._calc_gastritis = getEncounterFieldValue(encounterReports, '_calc_gastritis');

          content._result_cholera = getEncounterFieldValue(encounterReports, '_calc_cholera');
          content._calc_cholera = getEncounterFieldValue(encounterReports, '_calc_cholera');

          // Skin Conditions (from CHD_Form003)
          content._result_impetigo = getEncounterFieldValue(encounterReports, '_result_impetigo');
          content._result_ring_worm = getEncounterFieldValue(encounterReports, '_result_ring_worm');
          content._result_scabies = getEncounterFieldValue(encounterReports, '_result_scabies');

          // Vision Screening (from CHD_Form004)
          content._screening_result = getEncounterFieldValue(encounterReports, '_screening_result', '');
          content._referral_reason_history = getEncounterFieldValue(encounterReports, '_referral_reason_history');
          content._referral_reason_va = getEncounterFieldValue(encounterReports, '_referral_reason_va');
          content._referral_reason_external = getEncounterFieldValue(encounterReports, '_referral_reason_external');

          // Wounds (from CHD_Form005)
          content._referral_needed = getEncounterFieldValue(encounterReports, '_referral_needed', 'no');
          content._severity_level = getEncounterFieldValue(encounterReports, '_severity_level', '');
          content._bleeding = getEncounterFieldValue(encounterReports, '_bleeding', '');
          content._infection_symptoms = getEncounterFieldValue(encounterReports, '_infection_symptoms', '');

          // Other Symptoms (from CHD_Form007)
          content._primary_body_system = getEncounterFieldValue(encounterReports, '_primary_body_system', '');
          content._symptom_severity = getEncounterFieldValue(encounterReports, '_symptom_severity', '');
          content._chronic_condition_history = getEncounterFieldValue(encounterReports, '_chronic_condition_history');

          // Malnutrition & Anemia (from CHD_Form008)
          content._result_severe_malnutrition_anemia = getEncounterFieldValue(encounterReports, '_result_severe_malnutrition_anemia');
          content._result_severe_anemia = getEncounterFieldValue(encounterReports, '_result_severe_anemia');
          content._result_moderate_anemia = getEncounterFieldValue(encounterReports, '_result_moderate_anemia');
        }
      }
    ],

    events: [{ start: 0, days: 0, end: 30 }]
  },

  // ----------------------------------------------------
  // ROUTE SUMMARY FORM - YOUTH/ADOLESCENT (6-17)
  // ----------------------------------------------------
  {
    name: 'triage_final_summary_youth',
    title: 'task.triage_final_summary_youth.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: TRIAGE_FORM_NAMES,

    appliesIf: function(c, r) {
      if (c.contact && c.contact.muted) return false;
      if (!r.fields || r.fields.patient_age_in_years < 6 || r.fields.patient_age_in_years > 17) return false;
      if (!isLatestTriageEncounter(c, r)) return false;

      const summaryAlreadySubmitted = (c.reports || []).some(report =>
        report.reported_date >= r.reported_date && report.form === 'YAA_Form009_Summary'
      );
      if (summaryAlreadySubmitted) return false;

      const requiredFormGroups = [];
      Object.keys(YOUTH_ROUTE_FORM_MAPPING).forEach(routeKey => {
        if (r.fields && r.fields[routeKey] === 'true') {
          requiredFormGroups.push(YOUTH_ROUTE_FORM_MAPPING[routeKey]);
        }
      });

      // Check if patient was flagged for emergency symptoms in the triage form
      if (r.fields && r.fields.has_emergency_symptoms === 'true') return true;

      if (requiredFormGroups.length === 0) return true;

      return requiredFormGroups.every(formNames =>
        isFormSubmittedInEncounter(c, r, null, formNames)
      );
    },

    actions: [
      {
        form: 'YAA_Form009_Summary',
        modifyContent: function(content, c, r) {
          // Forward contact hierarchy
          const contactDoc = c.contact || c;
          content.contact = contactDoc;
          if (contactDoc.parent && contactDoc.parent._id) {
            content.clinic_id = contactDoc.parent._id;
          }

          const encounterReports = (c.reports || []).filter(report => report.reported_date >= r.reported_date);

          // Emergency Symptoms Mapping from Triage
          content._has_emergency_symptoms = getEncounterFieldValue(encounterReports, '_has_emergency_symptoms');
          content._emergency_dehydration = getEncounterFieldValue(encounterReports, '_emergency_dehydration');
          content._emergency_respiratory_distress = getEncounterFieldValue(encounterReports, '_emergency_respiratory_distress');
          content._emergency_altered_consciousness = getEncounterFieldValue(encounterReports, '_emergency_altered_consciousness');
          content._emergency_acute_malnutrition = getEncounterFieldValue(encounterReports, '_emergency_acute_malnutrition');
          content._emergency_bloated_extremities = getEncounterFieldValue(encounterReports, '_emergency_bloated_extremities');

          // Pregnancy
          content._pregnancy_form_purpose = getEncounterFieldValue(encounterReports, '_pregnancy_form_purpose');
          content._pregnancy_test_result = getEncounterFieldValue(encounterReports,'_pregnancy_test_result');
          content._result_gestational_hypertension_no_serious = getEncounterFieldValue(encounterReports, '_result_gestational_hypertension_no_serious');
          content._result_gestational_hypertension_serious = getEncounterFieldValue(encounterReports, '_result_gestational_hypertension_serious');
          content._result_pre_eclampsia = getEncounterFieldValue(encounterReports, '_result_pre_eclampsia');
          content._result_genitourinary_infections = getEncounterFieldValue(encounterReports, '_result_genitourinary_infections');
          content._result_threatened_miscarriage_less20 = getEncounterFieldValue(encounterReports, '_result_threatened_miscarriage_less20');
          content._result_threatened_miscarriage_greater20 = getEncounterFieldValue(encounterReports, '_result_threatened_miscarriage_greater20');

          
          // Respiratory Conditions (from YAA_Form002)
          content._result_flu_like_syndrome = getEncounterFieldValue(encounterReports, '_result_flu_like_syndrome');
          content._result_pneumonia_pink = getEncounterFieldValue(encounterReports, '_result_pneumonia_pink');
          content._result_pneumonia_yellow = getEncounterFieldValue(encounterReports, '_result_pneumonia_yellow');
          content._result_tonsillitis = getEncounterFieldValue(encounterReports, '_result_tonsillitis');

          // Digestive Conditions (from YAA_Form001)
          content._result_gastritis = getEncounterFieldValue(encounterReports, '_result_gastritis');
          content._result_dehydration = getEncounterFieldValue(encounterReports, '_result_dehydration');
          content._result_dysentery = getEncounterFieldValue(encounterReports, '_result_dysentery');

          // Skin Conditions (from YAA_Form003)
          content._result_impetigo = getEncounterFieldValue(encounterReports, '_result_impetigo');
          content._result_ring_worm = getEncounterFieldValue(encounterReports, '_result_ring_worm');
          content._result_scabies = getEncounterFieldValue(encounterReports, '_result_scabies');

          // UTI and STD (from YAA_Form004)
          content._result_uti = getEncounterFieldValue(encounterReports, '_result_uti');
          content._result_glomerulonephritis = getEncounterFieldValue(encounterReports, '_result_glomerulonephritis');
          content._result_syphilis = getEncounterFieldValue(encounterReports, '_result_syphilis');
          content._result_other_std = getEncounterFieldValue(encounterReports, '_result_other_std');

          // Malnutrition & Anemia (from YAA_Form008)
          content._result_anemia = getEncounterFieldValue(encounterReports, '_result_anemia');

          // Vision Screening (from YAA_Form005_Vision)
          content._screening_result = getEncounterFieldValue(encounterReports, '_screening_result', '');
          content._blurred_vision = getEncounterFieldValue(encounterReports, '_blurred_vision');
          content._wears_spectacles = getEncounterFieldValue(encounterReports, '_wears_spectacles', '');
          content._eye_pain = getEncounterFieldValue(encounterReports, '_eye_pain');
          content._history_diabetes = getEncounterFieldValue(encounterReports, '_history_diabetes');
          content._va_distance_right = getEncounterFieldValue(encounterReports, '_va_distance_right', '');
          content._va_distance_left = getEncounterFieldValue(encounterReports, '_va_distance_left', '');
          content._ext_crust_pus = getEncounterFieldValue(encounterReports, '_ext_crust_pus');
          content._referral_reason_history = getEncounterFieldValue(encounterReports, '_referral_reason_history');
          content._referral_reason_va = getEncounterFieldValue(encounterReports, '_referral_reason_va');
          content._referral_reason_external = getEncounterFieldValue(encounterReports, '_referral_reason_external');

          // Wounds (from YAA_Form006_Wounds)
          content._body_part = getEncounterFieldValue(encounterReports, '_body_part', '');
          content._wound_types = getEncounterFieldValue(encounterReports, '_wound_types', '');
          content._severity_level = getEncounterFieldValue(encounterReports, '_severity_level', '');
          content._wound_duration = getEncounterFieldValue(encounterReports, '_wound_duration', '');
          content._bleeding = getEncounterFieldValue(encounterReports, '_bleeding', '');
          content._infection_symptoms = getEncounterFieldValue(encounterReports, '_infection_symptoms', '');
          content._referral_needed = getEncounterFieldValue(encounterReports, '_referral_needed', 'no');

          // Other / Unclassified Symptoms (from YAA_Form007_Other)
          content._primary_body_system = getEncounterFieldValue(encounterReports, '_primary_body_system', '');
          content._symptom_duration = getEncounterFieldValue(encounterReports, '_symptom_duration', '');
          content._symptom_severity = getEncounterFieldValue(encounterReports, '_symptom_severity', '');
          content._prior_similar_episodes = getEncounterFieldValue(encounterReports, '_prior_similar_episodes');
          content._current_medications_taken = getEncounterFieldValue(encounterReports, '_current_medications_taken');
          content._medication_details = getEncounterFieldValue(encounterReports, '_medication_details', '');
          content._chronic_condition_history = getEncounterFieldValue(encounterReports, '_chronic_condition_history');
          content._chronic_condition_details = getEncounterFieldValue(encounterReports, '_chronic_condition_details', '');
          content._other_symptom_description = getEncounterFieldValue(encounterReports, '_other_symptom_description', '');
          content._symptoms_cardiovascular = getEncounterFieldValue(encounterReports, '_symptoms_cardiovascular', '');
          content._symptoms_respiratory = getEncounterFieldValue(encounterReports, '_symptoms_respiratory', '');
          content._symptoms_gastrointestinal = getEncounterFieldValue(encounterReports, '_symptoms_gastrointestinal', '');
          content._symptoms_neurological = getEncounterFieldValue(encounterReports, '_symptoms_neurological', '');
          content._symptoms_musculoskeletal = getEncounterFieldValue(encounterReports, '_symptoms_musculoskeletal', '');
          content._symptoms_dermatological = getEncounterFieldValue(encounterReports, '_symptoms_dermatological', '');
          content._symptoms_genitourinary = getEncounterFieldValue(encounterReports, '_symptoms_genitourinary', '');
          content._symptoms_ent_dental = getEncounterFieldValue(encounterReports, '_symptoms_ent_dental', '');
          content._symptoms_ophthalmologic = getEncounterFieldValue(encounterReports, '_symptoms_ophthalmologic', '');
          content._symptoms_mental_health = getEncounterFieldValue(encounterReports, '_symptoms_mental_health', '');
          content._symptoms_constitutional = getEncounterFieldValue(encounterReports, '_symptoms_constitutional', '');


          // Vision Screening (from YAA_Form005_Vision)
          content._screening_result = getEncounterFieldValue(encounterReports, '_screening_result', '');
          content._blurred_vision = getEncounterFieldValue(encounterReports, '_blurred_vision');
          content._wears_spectacles = getEncounterFieldValue(encounterReports, '_wears_spectacles', '');
          content._eye_pain = getEncounterFieldValue(encounterReports, '_eye_pain');
          content._history_diabetes = getEncounterFieldValue(encounterReports, '_history_diabetes');
          content._va_distance_right = getEncounterFieldValue(encounterReports, '_va_distance_right', '');
          content._va_distance_left = getEncounterFieldValue(encounterReports, '_va_distance_left', '');
          content._ext_crust_pus = getEncounterFieldValue(encounterReports, '_ext_crust_pus');
          content._referral_reason_history = getEncounterFieldValue(encounterReports, '_referral_reason_history');
          content._referral_reason_va = getEncounterFieldValue(encounterReports, '_referral_reason_va');
          content._referral_reason_external = getEncounterFieldValue(encounterReports, '_referral_reason_external');

          // Wounds (from YAA_Form006_Wounds)
          content._body_part = getEncounterFieldValue(encounterReports, '_body_part', '');
          content._wound_types = getEncounterFieldValue(encounterReports, '_wound_types', '');
          content._severity_level = getEncounterFieldValue(encounterReports, '_severity_level', '');
          content._wound_duration = getEncounterFieldValue(encounterReports, '_wound_duration', '');
          content._bleeding = getEncounterFieldValue(encounterReports, '_bleeding', '');
          content._infection_symptoms = getEncounterFieldValue(encounterReports, '_infection_symptoms', '');
          content._referral_needed = getEncounterFieldValue(encounterReports, '_referral_needed', 'no');

          // Other / Unclassified Symptoms (from YAA_Form007_Other)
          content._primary_body_system = getEncounterFieldValue(encounterReports, '_primary_body_system', '');
          content._symptom_duration = getEncounterFieldValue(encounterReports, '_symptom_duration', '');
          content._symptom_severity = getEncounterFieldValue(encounterReports, '_symptom_severity', '');
          content._prior_similar_episodes = getEncounterFieldValue(encounterReports, '_prior_similar_episodes');
          content._current_medications_taken = getEncounterFieldValue(encounterReports, '_current_medications_taken');
          content._medication_details = getEncounterFieldValue(encounterReports, '_medication_details', '');
          content._chronic_condition_history = getEncounterFieldValue(encounterReports, '_chronic_condition_history');
          content._chronic_condition_details = getEncounterFieldValue(encounterReports, '_chronic_condition_details', '');
          content._other_symptom_description = getEncounterFieldValue(encounterReports, '_other_symptom_description', '');
          content._symptoms_cardiovascular = getEncounterFieldValue(encounterReports, '_symptoms_cardiovascular', '');
          content._symptoms_respiratory = getEncounterFieldValue(encounterReports, '_symptoms_respiratory', '');
          content._symptoms_gastrointestinal = getEncounterFieldValue(encounterReports, '_symptoms_gastrointestinal', '');
          content._symptoms_neurological = getEncounterFieldValue(encounterReports, '_symptoms_neurological', '');
          content._symptoms_musculoskeletal = getEncounterFieldValue(encounterReports, '_symptoms_musculoskeletal', '');
          content._symptoms_dermatological = getEncounterFieldValue(encounterReports, '_symptoms_dermatological', '');
          content._symptoms_genitourinary = getEncounterFieldValue(encounterReports, '_symptoms_genitourinary', '');
          content._symptoms_ent_dental = getEncounterFieldValue(encounterReports, '_symptoms_ent_dental', '');
          content._symptoms_ophthalmologic = getEncounterFieldValue(encounterReports, '_symptoms_ophthalmologic', '');
          content._symptoms_mental_health = getEncounterFieldValue(encounterReports, '_symptoms_mental_health', '');
          content._symptoms_constitutional = getEncounterFieldValue(encounterReports, '_symptoms_constitutional', '');
          
          // General / Referral
          content._result_urgent_referral = getEncounterFieldValue(encounterReports, '_result_urgent_referral');
        }
      }
    ],

    events: [{ start: 0, days: 0, end: 30 }]
  },

  // ----------------------------------------------------
  // ROUTE SUMMARY FORM - ADULT (18-64)
  // ----------------------------------------------------
  {
    name: 'triage_final_summary_adult',
    title: 'task.triage_final_summary_adult.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: TRIAGE_FORM_NAMES,

    appliesIf: function(c, r) {
      if (c.contact && c.contact.muted) return false;
      if (!r.fields || r.fields.patient_age_in_years < 18 || r.fields.patient_age_in_years > 64) return false;
      if (!isLatestTriageEncounter(c, r)) return false;

      const summaryAlreadySubmitted = (c.reports || []).some(report =>
        report.reported_date >= r.reported_date && report.form === 'ADT_Form014_Summary'
      );
      if (summaryAlreadySubmitted) return false;

      const requiredFormGroups = [];
      Object.keys(ADULT_ROUTE_FORM_MAPPING).forEach(routeKey => {
        if (r.fields && r.fields[routeKey] === 'true') {
          requiredFormGroups.push(ADULT_ROUTE_FORM_MAPPING[routeKey]);
        }
      });

      // Check if patient was flagged for emergency symptoms in the triage form
      if (r.fields && r.fields.has_emergency_symptoms === 'true') return true;

      if (requiredFormGroups.length === 0) return true;

      return requiredFormGroups.every(formNames =>
        isFormSubmittedInEncounter(c, r, null, formNames)
      );
    },

    actions: [
      {
        form: 'ADT_Form014_Summary',
        modifyContent: function(content, c, r) {
          // Forward contact hierarchy
          const contactDoc = c.contact || c;
          content.contact = contactDoc;
          if (contactDoc.parent && contactDoc.parent._id) {
            content.clinic_id = contactDoc.parent._id;
          }

          const encounterReports = (c.reports || []).filter(report => report.reported_date >= r.reported_date);

          content._has_emergency_symptoms = getEncounterFieldValue(encounterReports,'_has_emergency_symptoms');
          
          content._result_hyperglycemia_mild = getEncounterFieldValue(encounterReports, '_result_hyperglycemia_mild');
          content._result_hyperglycemia_moderate = getEncounterFieldValue(encounterReports, '_result_hyperglycemia_moderate');
          content._result_hyperglycemia_severe = getEncounterFieldValue(encounterReports, '_result_hyperglycemia_severe');
          content._metformin_dosage = getEncounterFieldValue(encounterReports, '_metformin_dosage', '');
          
          content._result_gastritis_serious = getEncounterFieldValue(encounterReports, '_result_gastritis_serious');
          content._result_gastritis_not_serious = getEncounterFieldValue(encounterReports, '_result_gastritis_not_serious');
          content._h_pylori_rapid_test_result = getEncounterFieldValue(encounterReports, '_h_pylori_rapid_test_result', '');
          content._result_risk_of_cholera = getEncounterFieldValue(encounterReports, '_result_risk_of_cholera');
          content._result_acute_diarrhea = getEncounterFieldValue(encounterReports, '_result_acute_diarrhea');
          content._result_amoeba_giardia = getEncounterFieldValue(encounterReports, '_result_amoeba_giardia');
          content._result_appendicitis_cholecystitis = getEncounterFieldValue(encounterReports, '_result_appendicitis_cholecystitis');

          content._result_risk_malaria = getEncounterFieldValue(encounterReports, '_result_risk_malaria');
          content._malaria_rapid_test_result = getEncounterFieldValue(encounterReports, '_malaria_rapid_test_result', '');

          content._result_hypertensive_urgency = getEncounterFieldValue(encounterReports, '_result_hypertensive_urgency');
          content._result_hypertension_grade_1 = getEncounterFieldValue(encounterReports, '_result_hypertension_grade_1');
          content._result_hypertension_grade_2 = getEncounterFieldValue(encounterReports, '_result_hypertension_grade_2');
          content._result_hypertension_grade_3 = getEncounterFieldValue(encounterReports, '_result_hypertension_grade_3');
          
          content._pregnancy_form_purpose = getEncounterFieldValue(encounterReports, '_pregnancy_form_purpose');
          content._pregnancy_test_result = getEncounterFieldValue(encounterReports,'_pregnancy_test_result');
          content._result_gestational_hypertension_no_serious = getEncounterFieldValue(encounterReports, '_result_gestational_hypertension_no_serious');
          content._result_gestational_hypertension_serious = getEncounterFieldValue(encounterReports, '_result_gestational_hypertension_serious');
          content._result_pre_eclampsia = getEncounterFieldValue(encounterReports, '_result_pre_eclampsia');
          content._result_genitourinary_infections = getEncounterFieldValue(encounterReports, '_result_genitourinary_infections');
          content._result_threatened_miscarriage_less20 = getEncounterFieldValue(encounterReports, '_result_threatened_miscarriage_less20');
          content._result_threatened_miscarriage_greater20 = getEncounterFieldValue(encounterReports, '_result_threatened_miscarriage_greater20');

          content._result_tuberculosis = getEncounterFieldValue(encounterReports, '_result_tuberculosis');
          content._result_asthma = getEncounterFieldValue(encounterReports, '_result_asthma');
          content._result_pneumonia = getEncounterFieldValue(encounterReports, '_result_pneumonia');
          content._result_flu_like_syndrome = getEncounterFieldValue(encounterReports, '_result_flu_like_syndrome');

          content._result_impetigo_folliculitis = getEncounterFieldValue(encounterReports, '_result_impetigo_folliculitis');
          content._result_ring_worm = getEncounterFieldValue(encounterReports, '_result_ring_worm');
          content._result_scabies = getEncounterFieldValue(encounterReports, '_result_scabies');

          content._result_transient_ischemic_attack = getEncounterFieldValue(encounterReports, '_result_transient_ischemic_attack');
          content._result_stroke = getEncounterFieldValue(encounterReports, '_result_stroke');
          content._result_old_stroke = getEncounterFieldValue(encounterReports, '_result_old_stroke');

          content._result_uti = getEncounterFieldValue(encounterReports, '_result_uti');
          content._result_std_discharge = getEncounterFieldValue(encounterReports, '_result_std_discharge');
          content._result_std_ulcer = getEncounterFieldValue(encounterReports, '_result_std_ulcer');

          content._result_moderate_anemia = getEncounterFieldValue(encounterReports, '_result_moderate_anemia');

          // Vision Screening (from ADT_Form010_Vision / ELD_Form010_Vision)
          content._screening_result = getEncounterFieldValue(encounterReports, '_screening_result', '');
          content._blurred_vision = getEncounterFieldValue(encounterReports, '_blurred_vision');
          content._wears_spectacles = getEncounterFieldValue(encounterReports, '_wears_spectacles', '');
          content._eye_pain = getEncounterFieldValue(encounterReports, '_eye_pain');
          content._history_diabetes = getEncounterFieldValue(encounterReports, '_history_diabetes');
          content._history_hypertension = getEncounterFieldValue(encounterReports, '_history_hypertension');
          content._eye_medications = getEncounterFieldValue(encounterReports, '_eye_medications');
          content._va_distance_right = getEncounterFieldValue(encounterReports, '_va_distance_right', '');
          content._va_distance_left = getEncounterFieldValue(encounterReports, '_va_distance_left', '');
          content._va_near_both = getEncounterFieldValue(encounterReports, '_va_near_both', '');
          content._ext_crust_pus = getEncounterFieldValue(encounterReports, '_ext_crust_pus');
          content._ext_excessive_watering = getEncounterFieldValue(encounterReports, '_ext_excessive_watering');
          content._ext_inward_eyelashes = getEncounterFieldValue(encounterReports, '_ext_inward_eyelashes');
          content._ext_abnormal_lid_closure = getEncounterFieldValue(encounterReports, '_ext_abnormal_lid_closure');
          content._ext_red_conjunctiva = getEncounterFieldValue(encounterReports, '_ext_red_conjunctiva');
          content._ext_hazy_cornea = getEncounterFieldValue(encounterReports, '_ext_hazy_cornea');
          content._referral_reason_systemic = getEncounterFieldValue(encounterReports, '_referral_reason_systemic');
          content._referral_reason_pain = getEncounterFieldValue(encounterReports, '_referral_reason_pain');
          content._referral_reason_medication = getEncounterFieldValue(encounterReports, '_referral_reason_medication');
          content._referral_reason_va = getEncounterFieldValue(encounterReports, '_referral_reason_va');
          content._referral_reason_external = getEncounterFieldValue(encounterReports, '_referral_reason_external');

          // Wounds (from ADT_Form011_Wounds / ELD_Form011_Wounds)
          content._body_part = getEncounterFieldValue(encounterReports, '_body_part', '');
          content._wound_types = getEncounterFieldValue(encounterReports, '_wound_types', '');
          content._severity_level = getEncounterFieldValue(encounterReports, '_severity_level', '');
          content._wound_duration = getEncounterFieldValue(encounterReports, '_wound_duration', '');
          content._bleeding = getEncounterFieldValue(encounterReports, '_bleeding', '');
          content._infection_symptoms = getEncounterFieldValue(encounterReports, '_infection_symptoms', '');
          content._referral_needed = getEncounterFieldValue(encounterReports, '_referral_needed', 'no');

          // Other / Unclassified Symptoms (from ADT_Form012_Other / ELD_Form013_Other)
          content._primary_body_system = getEncounterFieldValue(encounterReports, '_primary_body_system', '');
          content._symptom_duration = getEncounterFieldValue(encounterReports, '_symptom_duration', '');
          content._symptom_severity = getEncounterFieldValue(encounterReports, '_symptom_severity', '');
          content._prior_similar_episodes = getEncounterFieldValue(encounterReports, '_prior_similar_episodes');
          content._current_medications_taken = getEncounterFieldValue(encounterReports, '_current_medications_taken');
          content._medication_details = getEncounterFieldValue(encounterReports, '_medication_details', '');
          content._chronic_condition_history = getEncounterFieldValue(encounterReports, '_chronic_condition_history');
          content._chronic_condition_details = getEncounterFieldValue(encounterReports, '_chronic_condition_details', '');
          content._other_symptom_description = getEncounterFieldValue(encounterReports, '_other_symptom_description', '');
          content._symptoms_cardiovascular = getEncounterFieldValue(encounterReports, '_symptoms_cardiovascular', '');
          content._symptoms_respiratory = getEncounterFieldValue(encounterReports, '_symptoms_respiratory', '');
          content._symptoms_gastrointestinal = getEncounterFieldValue(encounterReports, '_symptoms_gastrointestinal', '');
          content._symptoms_neurological = getEncounterFieldValue(encounterReports, '_symptoms_neurological', '');
          content._symptoms_musculoskeletal = getEncounterFieldValue(encounterReports, '_symptoms_musculoskeletal', '');
          content._symptoms_dermatological = getEncounterFieldValue(encounterReports, '_symptoms_dermatological', '');
          content._symptoms_genitourinary = getEncounterFieldValue(encounterReports, '_symptoms_genitourinary', '');
          content._symptoms_ent_dental = getEncounterFieldValue(encounterReports, '_symptoms_ent_dental', '');
          content._symptoms_ophthalmologic = getEncounterFieldValue(encounterReports, '_symptoms_ophthalmologic', '');
          content._symptoms_mental_health = getEncounterFieldValue(encounterReports, '_symptoms_mental_health', '');
          content._symptoms_constitutional = getEncounterFieldValue(encounterReports, '_symptoms_constitutional', '');
          content._screening_type = getEncounterFieldValue(encounterReports, '_screening_type', '');
        }
      }
    ],

    events: [{ start: 0, days: 0, end: 30 }]
  },

  // ----------------------------------------------------
  // ROUTE SUMMARY FORM - ELDERLY (> 64)
  // ----------------------------------------------------
  {
    name: 'triage_final_summary_elderly',
    title: 'task.triage_final_summary_elderly.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: TRIAGE_FORM_NAMES,

    appliesIf: function(c, r) {
      if (c.contact && c.contact.muted) return false;
      if (!r.fields || r.fields.patient_age_in_years <= 64) return false;
      if (!isLatestTriageEncounter(c, r)) return false;

      const summaryAlreadySubmitted = (c.reports || []).some(report =>
        report.reported_date >= r.reported_date && report.form === 'ELD_Form012_Summary'
      );
      if (summaryAlreadySubmitted) return false;

      const requiredFormGroups = [];
      Object.keys(ELDERLY_ROUTE_FORM_MAPPING).forEach(routeKey => {
        if (r.fields && r.fields[routeKey] === 'true') {
          requiredFormGroups.push(ELDERLY_ROUTE_FORM_MAPPING[routeKey]);
        }
      });

      // Check if patient was flagged for emergency symptoms in the triage form
      if (r.fields && (r.fields._has_emergency_symptoms === 'true' || r.fields.has_emergency_symptoms === 'yes')) {
        return true;
      }

      if (requiredFormGroups.length === 0) return true;

      return requiredFormGroups.every(formNames =>
        isFormSubmittedInEncounter(c, r, null, formNames)
      );
    },

    actions: [
      {
        form: 'ELD_Form012_Summary',
        modifyContent: function(content, c, r) {
          // Forward contact hierarchy
          const contactDoc = c.contact || c;
          content.contact = contactDoc;
          if (contactDoc.parent && contactDoc.parent._id) {
            content.clinic_id = contactDoc.parent._id;
          }

          const encounterReports = (c.reports || []).filter(report => report.reported_date >= r.reported_date);

          content._has_emergency_symptoms = getEncounterFieldValue(encounterReports,'_has_emergency_symptoms');
          
          content._result_hyperglycemia_mild = getEncounterFieldValue(encounterReports, '_result_hyperglycemia_mild');
          content._result_hyperglycemia_moderate = getEncounterFieldValue(encounterReports, '_result_hyperglycemia_moderate');
          content._result_hyperglycemia_severe = getEncounterFieldValue(encounterReports, '_result_hyperglycemia_severe');
          content._metformin_dosage = getEncounterFieldValue(encounterReports, '_metformin_dosage', '');
          content._result_gastritis_serious = getEncounterFieldValue(encounterReports, '_result_gastritis_serious');
          content._result_gastritis_not_serious = getEncounterFieldValue(encounterReports, '_result_gastritis_not_serious');
          content._h_pylori_rapid_test_result = getEncounterFieldValue(encounterReports, '_h_pylori_rapid_test_result', '');
          content._result_risk_of_cholera = getEncounterFieldValue(encounterReports, '_result_risk_of_cholera');
          content._result_acute_diarrhea = getEncounterFieldValue(encounterReports, '_result_acute_diarrhea');
          content._result_amoeba_giardia = getEncounterFieldValue(encounterReports, '_result_amoeba_giardia');
          content._result_appendicitis_cholecystitis = getEncounterFieldValue(encounterReports, '_result_appendicitis_cholecystitis');
          content._result_risk_malaria = getEncounterFieldValue(encounterReports, '_result_risk_malaria');
          content._malaria_rapid_test_result = getEncounterFieldValue(encounterReports, '_malaria_rapid_test_result', '');
          content._result_hypertensive_urgency = getEncounterFieldValue(encounterReports, '_result_hypertensive_urgency');
          content._result_hypertension_grade_1 = getEncounterFieldValue(encounterReports, '_result_hypertension_grade_1');
          content._result_hypertension_grade_2 = getEncounterFieldValue(encounterReports, '_result_hypertension_grade_2');
          content._result_hypertension_grade_3 = getEncounterFieldValue(encounterReports, '_result_hypertension_grade_3');
          content._result_impetigo_folliculitis = getEncounterFieldValue(encounterReports, '_result_impetigo_folliculitis');
          content._result_ring_worm = getEncounterFieldValue(encounterReports, '_result_ring_worm');
          content._result_scabies = getEncounterFieldValue(encounterReports, '_result_scabies');
          content._result_transient_ischemic_attack = getEncounterFieldValue(encounterReports, '_result_transient_ischemic_attack');
          content._result_stroke = getEncounterFieldValue(encounterReports, '_result_stroke');
          content._result_old_stroke = getEncounterFieldValue(encounterReports, '_result_old_stroke');
          content._result_moderate_anemia = getEncounterFieldValue(encounterReports, '_result_moderate_anemia');

          content._result_tuberculosis = getEncounterFieldValue(encounterReports, '_result_tuberculosis');
          content._result_asthma = getEncounterFieldValue(encounterReports, '_result_asthma');
          content._result_pneumonia = getEncounterFieldValue(encounterReports, '_result_pneumonia');
          content._result_flu_like_syndrome = getEncounterFieldValue(encounterReports, '_result_flu_like_syndrome');
          content._result_uti = getEncounterFieldValue(encounterReports, '_result_uti');
          content._result_std_discharge = getEncounterFieldValue(encounterReports, '_result_std_discharge');
          content._result_std_ulcer = getEncounterFieldValue(encounterReports, '_result_std_ulcer');
          content._result_chronic_pain = getEncounterFieldValue(encounterReports, '_result_chronic_pain');
          content._result_referral_needed = getEncounterFieldValue(encounterReports, '_result_referral_needed');

          // Vision Screening (from ADT_Form010_Vision / ELD_Form010_Vision)
          content._screening_result = getEncounterFieldValue(encounterReports, '_screening_result', '');
          content._blurred_vision = getEncounterFieldValue(encounterReports, '_blurred_vision');
          content._wears_spectacles = getEncounterFieldValue(encounterReports, '_wears_spectacles', '');
          content._eye_pain = getEncounterFieldValue(encounterReports, '_eye_pain');
          content._history_diabetes = getEncounterFieldValue(encounterReports, '_history_diabetes');
          content._history_hypertension = getEncounterFieldValue(encounterReports, '_history_hypertension');
          content._eye_medications = getEncounterFieldValue(encounterReports, '_eye_medications');
          content._va_distance_right = getEncounterFieldValue(encounterReports, '_va_distance_right', '');
          content._va_distance_left = getEncounterFieldValue(encounterReports, '_va_distance_left', '');
          content._va_near_both = getEncounterFieldValue(encounterReports, '_va_near_both', '');
          content._ext_crust_pus = getEncounterFieldValue(encounterReports, '_ext_crust_pus');
          content._ext_excessive_watering = getEncounterFieldValue(encounterReports, '_ext_excessive_watering');
          content._ext_inward_eyelashes = getEncounterFieldValue(encounterReports, '_ext_inward_eyelashes');
          content._ext_abnormal_lid_closure = getEncounterFieldValue(encounterReports, '_ext_abnormal_lid_closure');
          content._ext_red_conjunctiva = getEncounterFieldValue(encounterReports, '_ext_red_conjunctiva');
          content._ext_hazy_cornea = getEncounterFieldValue(encounterReports, '_ext_hazy_cornea');
          content._referral_reason_systemic = getEncounterFieldValue(encounterReports, '_referral_reason_systemic');
          content._referral_reason_pain = getEncounterFieldValue(encounterReports, '_referral_reason_pain');
          content._referral_reason_medication = getEncounterFieldValue(encounterReports, '_referral_reason_medication');
          content._referral_reason_va = getEncounterFieldValue(encounterReports, '_referral_reason_va');
          content._referral_reason_external = getEncounterFieldValue(encounterReports, '_referral_reason_external');

          // Wounds (from ADT_Form011_Wounds / ELD_Form011_Wounds)
          content._body_part = getEncounterFieldValue(encounterReports, '_body_part', '');
          content._wound_types = getEncounterFieldValue(encounterReports, '_wound_types', '');
          content._severity_level = getEncounterFieldValue(encounterReports, '_severity_level', '');
          content._wound_duration = getEncounterFieldValue(encounterReports, '_wound_duration', '');
          content._bleeding = getEncounterFieldValue(encounterReports, '_bleeding', '');
          content._infection_symptoms = getEncounterFieldValue(encounterReports, '_infection_symptoms', '');
          content._referral_needed = getEncounterFieldValue(encounterReports, '_referral_needed', 'no');

          // Elderly-specific conditions (Chronic Pain, Cardiac Decompensation, Prostate)
          content._result_arthroses_arthritis = getEncounterFieldValue(encounterReports, '_result_arthroses_arthritis');
          content._result_cardiac_decompensation_risk = getEncounterFieldValue(encounterReports, '_result_cardiac_decompensation_risk');
          content._result_cardiac_decompensation = getEncounterFieldValue(encounterReports, '_result_cardiac_decompensation');
          content._result_prostate_concerns = getEncounterFieldValue(encounterReports, '_result_prostate_concerns');

          // Other / Unclassified Symptoms (from ADT_Form012_Other / ELD_Form013_Other)
          content._primary_body_system = getEncounterFieldValue(encounterReports, '_primary_body_system', '');
          content._symptom_duration = getEncounterFieldValue(encounterReports, '_symptom_duration', '');
          content._symptom_severity = getEncounterFieldValue(encounterReports, '_symptom_severity', '');
          content._prior_similar_episodes = getEncounterFieldValue(encounterReports, '_prior_similar_episodes');
          content._current_medications_taken = getEncounterFieldValue(encounterReports, '_current_medications_taken');
          content._medication_details = getEncounterFieldValue(encounterReports, '_medication_details', '');
          content._chronic_condition_history = getEncounterFieldValue(encounterReports, '_chronic_condition_history');
          content._chronic_condition_details = getEncounterFieldValue(encounterReports, '_chronic_condition_details', '');
          content._other_symptom_description = getEncounterFieldValue(encounterReports, '_other_symptom_description', '');
          content._symptoms_cardiovascular = getEncounterFieldValue(encounterReports, '_symptoms_cardiovascular', '');
          content._symptoms_respiratory = getEncounterFieldValue(encounterReports, '_symptoms_respiratory', '');
          content._symptoms_gastrointestinal = getEncounterFieldValue(encounterReports, '_symptoms_gastrointestinal', '');
          content._symptoms_neurological = getEncounterFieldValue(encounterReports, '_symptoms_neurological', '');
          content._symptoms_musculoskeletal = getEncounterFieldValue(encounterReports, '_symptoms_musculoskeletal', '');
          content._symptoms_dermatological = getEncounterFieldValue(encounterReports, '_symptoms_dermatological', '');
          content._symptoms_genitourinary = getEncounterFieldValue(encounterReports, '_symptoms_genitourinary', '');
          content._symptoms_ent_dental = getEncounterFieldValue(encounterReports, '_symptoms_ent_dental', '');
          content._symptoms_ophthalmologic = getEncounterFieldValue(encounterReports, '_symptoms_ophthalmologic', '');
          content._symptoms_mental_health = getEncounterFieldValue(encounterReports, '_symptoms_mental_health', '');
          content._symptoms_constitutional = getEncounterFieldValue(encounterReports, '_symptoms_constitutional', '');
          content._screening_type = getEncounterFieldValue(encounterReports, '_screening_type', '');
          // Presbyopia (from ELD_Form010_Vision)
          content._trial_spectacle_power = getEncounterFieldValue(encounterReports, '_trial_spectacle_power', '');
          content._va_near_with_glasses = getEncounterFieldValue(encounterReports, '_va_near_with_glasses', '');
          content._reading_glasses_dispensed = getEncounterFieldValue(encounterReports, '_reading_glasses_dispensed', '');
          content._presbyopia_corrected = getEncounterFieldValue(encounterReports, '_presbyopia_corrected');
        }
      }
    ],

    events: [{ start: 0, days: 0, end: 30 }]
  },

  // ----------------------------------------------------
  // OTHER / UNCLASSIFIED SYMPTOMS
  // ----------------------------------------------------
  {
    name: 'children_triage_route_other',
    title: 'task.followup.other.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_other === 'true' && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form007_Other' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_other',
    title: 'task.followup.other.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_other === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form007_Other' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_other',
    title: 'task.followup.other.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_other === 'true' && r.fields.patient_age_in_years >= 18 && r.fields.patient_age_in_years <= 64;
    },
    actions: [{ form: 'ADT_Form012_Other' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'elderly_triage_route_other',
    title: 'task.followup.other.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_other === 'true' && r.fields.patient_age_in_years > 64;
    },
    actions: [{ form: 'ELD_Form013_Other' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // ANEMIA & MALNUTRITION
  // ----------------------------------------------------
  {
    name: 'children_triage_route_anemia',
    title: 'task.followup.malnutrition_anemia.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      const isAnemiaRoute =
        r.fields &&
        (r.fields.route_anemia_malnutrition === 'true' || r.fields.route_malnutrition_anemia === 'true');
      return !c.contact.muted && isAnemiaRoute && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form008_Malnutrition_Anemia' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_anemia',
    title: 'task.followup.malnutrition_anemia.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_anemia === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form008_Malnutrition_Anemia' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_anemia',
    title: 'task.followup.anemia.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_anemia === 'true' && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form013_Anemia' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // DIGESTIVE CONDITIONS
  // ----------------------------------------------------
  {
    name: 'children_triage_route_digestive',
    title: 'task.followup.digestive.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_digestive === 'true' && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form001_DigestiveConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_digestive',
    title: 'task.followup.digestive.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_digestive === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form001_DigestiveConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_digestive',
    title: 'task.followup.digestive.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_digestive === 'true' && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form002_DigestiveConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // FEVER
  // ----------------------------------------------------
  {
    name: 'adult_triage_route_fever',
    title: 'task.followup.fever.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_fever === 'true' && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form003_Fever' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // HYPERTENSION
  // ----------------------------------------------------
  {
    name: 'adult_triage_route_hypertension',
    title: 'task.followup.hypertension.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && (r.fields.route_hypertension === 'true' || r.fields.route_stroke === 'true') && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form004_Hypertension' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // PREGNANCY
  // ----------------------------------------------------
  {
    name: 'adult_triage_route_pregnancy',
    title: 'task.followup.pregnancy.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_pregnancy === 'true' && r.fields.patient_age_in_years >= 18 && r.fields.patient_age_in_years <= 64;
    },
    actions: [{ form: 'ADT_Form005_Pregnancy' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  // youth route pregnancy
  {
    name: 'youth_triage_route_pregnancy',
    title: 'task.followup.pregnancy.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_pregnancy === 'true' && r.fields.patient_age_in_years >= 12 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'ADT_Form005_Pregnancy'}],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // RESPIRATORY CONDITIONS & INFECTIONS
  // ----------------------------------------------------
  {
    name: 'children_triage_route_respiratory',
    title: 'task.followup.respiratory_infections.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_respiratory === 'true' && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form002_RespiratoryInfections' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_respiratory',
    title: 'task.followup.respiratory_conditions.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_respiratory === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form002_RespiratoryConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_respiratory',
    title: 'task.followup.respiratory_conditions.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_respiratory === 'true' && r.fields.patient_age_in_years >= 18 && r.fields.patient_age_in_years <= 64;
    },
    actions: [{ form: 'ADT_Form006_RespiratoryConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'elderly_triage_route_respiratory',
    title: 'task.followup.respiratory_conditions.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_respiratory === 'true' && r.fields.patient_age_in_years > 64;
    },
    actions: [{ form: 'ELD_Form006_RespiratoryConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // CHRONIC PAIN (ELDERLY)
  // ----------------------------------------------------
  {
    name: 'elderly_triage_route_chronic_pain',
    title: 'task.followup.chronic_pain.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_chronic_pain === 'true' && r.fields.patient_age_in_years > 64;
    },
    actions: [{ form: 'ELD_Form001_ChronicPain' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // SKIN CONDITIONS
  // ----------------------------------------------------
  {
    name: 'children_triage_route_skin',
    title: 'task.followup.skin.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_skin === 'true' && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form003_SkinConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_skin',
    title: 'task.followup.skin.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_skin === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form003_SkinConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_skin',
    title: 'task.followup.skin.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_skin === 'true' && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form007_SkinConditions' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  
  // ----------------------------------------------------
  // STROKE
  // ----------------------------------------------------
  {
    name: 'adult_triage_route_stroke',
    title: 'task.followup.stroke.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_stroke === 'true' && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form008_Stroke' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  
  // ----------------------------------------------------
  // UTI AND STD
  // ----------------------------------------------------
  {
    name: 'youth_triage_route_uti_std',
    title: 'task.followup.uti_std.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_uti_std === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form004_UTIandSTD' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_uti_std',
    title: 'task.followup.uti_std.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_uti_std === 'true' && r.fields.patient_age_in_years >= 18 && r.fields.patient_age_in_years <= 64;
    },
    actions: [{ form: 'ADT_Form009_UTIandSTD' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'elderly_triage_route_uti_std',
    title: 'task.followup.uti_std.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_uti_std === 'true' && r.fields.patient_age_in_years > 64;
    },
    actions: [{ form: 'ELD_Form009_UTIandSTD' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // WOUNDS
  // ----------------------------------------------------
  {
    name: 'children_triage_route_wound',
    title: 'task.followup.wound.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_wound === 'true' && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form005_Wounds' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_wound',
    title: 'task.followup.wound.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_wound === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form006_Wounds' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_wound',
    title: 'task.followup.wound.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_wound === 'true' && r.fields.patient_age_in_years >= 18 && r.fields.patient_age_in_years <= 64;
    },
    actions: [{ form: 'ADT_Form011_Wounds' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'elderly_triage_route_wound',
    title: 'task.followup.wound.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_wound === 'true' && r.fields.patient_age_in_years > 64;
    },
    actions: [{ form: 'ELD_Form011_Wounds' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // VISION
  // ----------------------------------------------------
  {
    name: 'children_triage_route_vision',
    title: 'task.followup.vision.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_vision === 'true' && r.fields.patient_age_in_years >= 0 && r.fields.patient_age_in_years <= 5;
    },
    actions: [{ form: 'CHD_Form004_Vision' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'youth_triage_route_vision',
    title: 'task.followup.vision.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_vision === 'true' && r.fields.patient_age_in_years >= 6 && r.fields.patient_age_in_years <= 17;
    },
    actions: [{ form: 'YAA_Form005_Vision' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'adult_triage_route_vision',
    title: 'task.followup.vision.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_vision === 'true' && r.fields.patient_age_in_years >= 18 && r.fields.patient_age_in_years <= 64;
    },
    actions: [{ form: 'ADT_Form010_Vision' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
  {
    name: 'elderly_triage_route_vision',
    title: 'task.followup.vision.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_vision === 'true' && r.fields.patient_age_in_years > 64;
    },
    actions: [{ form: 'ELD_Form010_Vision' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },

  // ----------------------------------------------------
  // DIABETES
  // ----------------------------------------------------
  {
    name: 'adult_triage_route_diabetes',
    title: 'task.followup.diabetes.title',
    icon: 'icon-healthcare',
    appliesTo: 'reports',
    appliesToType: ['TRI_Form001_Triage', 'TRI_Form002_Child_Triage'],
    appliesIf: function(c, r) {
      return !c.contact.muted && r.fields.route_diabetes === 'true' && r.fields.patient_age_in_years >= 18;
    },
    actions: [{ form: 'ADT_Form001_Diabetes' }],
    events: [{ start: 1, days: 1, end: 0 }]
  },
];