-- SQL Script to initialize PG Rules for a branch
-- Replace 'YOUR_BRANCH_ID' with the specific branch ID

UPDATE pg_configs
SET rules = ARRAY[
  'Rent must be paid by the 5th of every month to avoid late fees.',
  'Notice period for vacating is strictly 30 days.',
  'Visitors are allowed only between 10 AM and 8 PM.',
  'No loud music or noise after 11 PM.',
  'Smoking and alcohol consumption are strictly prohibited on premises.',
  'Please turn off lights, fans, and AC when leaving the room.',
  'Maintain cleanliness in common areas and bathrooms.',
  'Any damage to property will be charged to the tenant.'
]
WHERE branch_id = 'YOUR_BRANCH_ID';
