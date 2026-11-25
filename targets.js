module.exports = [
  // 1. Assessment & Utilization Volume
  {
    id: 'total_monthly_assessments',
    translation_key: 'targets.assessments.total',
    type: 'count',
    icon: 'icon-healthcare',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['CHD_Form009_Summary', 'YAA_Form009_Summary', 'ADT_Form014_Summary', 'ELD_Form012_Summary'],
    date: 'reported'
  },
  {
    id: 'assessments_chd',
    translation_key: 'targets.assessments.demographic.chd',
    type: 'count',
    icon: 'icon-child',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['CHD_Form009_Summary'],
    date: 'reported'
  },
  {
    id: 'assessments_yaa',
    translation_key: 'targets.assessments.demographic.yaa',
    type: 'count',
    icon: 'icon-youth',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['YAA_Form009_Summary'],
    date: 'reported'
  },
  {
    id: 'assessments_adt',
    translation_key: 'targets.assessments.demographic.adt',
    type: 'count',
    icon: 'icon-person',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['ADT_Form014_Summary'],
    date: 'reported'
  },
  {
    id: 'assessments_eld',
    translation_key: 'targets.assessments.demographic.eld',
    type: 'count',
    icon: 'icon-elderly',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['ELD_Form012_Summary'],
    date: 'reported'
  },
  {
    id: 'assessments_female',
    translation_key: 'targets.assessments.gender.female',
    type: 'count',
    icon: 'icon-female',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['CHD_Form009_Summary', 'YAA_Form009_Summary', 'ADT_Form014_Summary', 'ELD_Form012_Summary'],
    date: 'reported',
    appliesIf: function(contact, report) {
      return report.fields && report.fields.patient_sex === 'female';
    }
  },
  {
    id: 'assessments_male',
    translation_key: 'targets.assessments.gender.male',
    type: 'count',
    icon: 'icon-male',
    goal: -1,
    appliesTo: 'reports',
    appliesToType: ['CHD_Form009_Summary', 'YAA_Form009_Summary', 'ADT_Form014_Summary', 'ELD_Form012_Summary'],
    date: 'reported',
    appliesIf: function(contact, report) {
      return report.fields && report.fields.patient_sex === 'male';
    }
  }
];