/** Matches Laravel config/companies.php */
export const DEFAULT_COMPANY_TYPE = 'Other';

/** Matches Laravel config/industries.php pack keys */
export const DEFAULT_INDUSTRY_KEY = 'universal';

export const INDUSTRY_OPTIONS = [
  { key: 'universal', label: 'Universal' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'retail', label: 'Retail' },
  { key: 'wholesale', label: 'Wholesale' },
  { key: 'manufacturing', label: 'Manufacturing' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'services', label: 'Services' },
  { key: 'distribution', label: 'Distribution' },
];

export const COMPANY_TYPES = [
  { value: 'LLC', label: 'LLC' },
  { value: 'Private', label: 'Private' },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Limited Partnership', label: 'Limited Partnership' },
  { value: 'Joint Venture', label: 'Joint Venture' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'S Corporation', label: 'S Corporation' },
  { value: 'Public Limited', label: 'Public Limited' },
  { value: 'Nonprofit', label: 'Nonprofit' },
  { value: 'Cooperative', label: 'Cooperative' },
  { value: 'Freelancer', label: 'Freelancer' },
  { value: 'Other', label: 'Other' },
];

export const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'PKR', label: 'PKR — Pakistani Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
];
