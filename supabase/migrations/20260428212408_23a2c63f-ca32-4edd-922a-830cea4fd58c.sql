-- Move Deb Greene and her supplies from Sunset/Richmond to Old East Durham
UPDATE public.profiles
   SET community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 WHERE id = 'bd6a4897-9d82-476f-97d9-74552ae7a616';

UPDATE public.user_roles
   SET community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 WHERE user_id = 'bd6a4897-9d82-476f-97d9-74552ae7a616';

UPDATE public.supplies
   SET community_id = '32ced731-eb7a-41f3-be63-be68db74b255'
 WHERE owner_id = 'bd6a4897-9d82-476f-97d9-74552ae7a616';