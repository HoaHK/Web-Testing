export const STORE = {
  id: '20201',
  token: '20201085',
  name: 'BLOGIC_QA-TEAM-THAO',
  path: 'store/20201/detail/20201085',
} as const;

export const CATEGORIES = [
  { deptId: 65, name: 'Signature Dim Sum' },
  { deptId: 68, name: 'Live Crab & Lobster' },
  { deptId: 70, name: 'Vegetable, Tofu' },
  { deptId: 47, name: 'Pastries & Sweets' },
  { deptId: 74, name: 'Specialty Cocktails' },
  { deptId: 73, name: 'Tea & Sauce' },
  { deptId: 90, name: 'NA' },
  { deptId: 118, name: 'Merch' },
] as const;

export const SOLD_OUT_DEPT_IDS = [68, 47] as const;

export const ITEM = {
  id: 'ae42e5c0-fc26-489e-b19b-976f6c881e23',
  name: 'Palette Soup Dumpling (XLB) (5)',
  price: 15,
} as const;
