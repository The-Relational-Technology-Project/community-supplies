-- Seed city_centroids with cities used by existing communities
INSERT INTO public.city_centroids (city_normalized, city_display, state_code, latitude, longitude) VALUES
  ('alexandria-va', 'Alexandria', 'VA', 38.8048, -77.0469),
  ('amherst-ma', 'Amherst', 'MA', 42.3732, -72.5199),
  ('annandale-va', 'Annandale', 'VA', 38.8307, -77.1964),
  ('arlington-va', 'Arlington', 'VA', 38.8799, -77.1067),
  ('austin-tx', 'Austin', 'TX', 30.2672, -97.7431),
  ('baltimore-md', 'Baltimore', 'MD', 39.2904, -76.6122),
  ('berkeley-ca', 'Berkeley', 'CA', 37.8715, -122.273),
  ('beverly-ma', 'Beverly', 'MA', 42.5584, -70.88),
  ('bowie-md', 'Bowie', 'MD', 39.0068, -76.7791),
  ('brighton-ny', 'Brighton', 'NY', 43.1284, -77.5697),
  ('brookeville-md', 'Brookeville', 'MD', 39.1817, -77.0578),
  ('brooklyn-ny', 'Brooklyn', 'NY', 40.6782, -73.9442),
  ('buffalo-ny', 'Buffalo', 'NY', 42.8864, -78.8784),
  ('cambridge-md', 'Cambridge', 'MD', 38.5632, -76.0788),
  ('carrboro-nc', 'Carrboro', 'NC', 35.9101, -79.0753),
  ('cary-nc', 'Cary', 'NC', 35.7915, -78.7811),
  ('cheverly-md', 'Cheverly', 'MD', 38.928, -76.9158),
  ('chevy-chase-dc', 'Chevy Chase', 'DC', 38.9686, -77.0786),
  ('chevy-chase-md', 'Chevy Chase', 'MD', 38.9686, -77.0786),
  ('cheyenne-wy', 'Cheyenne', 'WY', 41.14, -104.8202),
  ('chicago-il', 'Chicago', 'IL', 41.8781, -87.6298),
  ('colorado-springs-co', 'Colorado Springs', 'CO', 38.8339, -104.8214),
  ('corvallis-or', 'Corvallis', 'OR', 44.5646, -123.262),
  ('davidsonville-md', 'Davidsonville', 'MD', 38.9573, -76.6311),
  ('denver-co', 'Denver', 'CO', 39.7392, -104.9903),
  ('durham-nc', 'Durham', 'NC', 35.994, -78.8986),
  ('ellicott-city-md', 'Ellicott City', 'MD', 39.2673, -76.7983),
  ('everett-wa', 'Everett', 'WA', 47.9789, -122.2021),
  ('excelsior-springs-mo', 'Excelsior Springs', 'MO', 39.339, -94.2261),
  ('fairfax-va', 'Fairfax', 'VA', 38.8462, -77.3064),
  ('falls-church-va', 'Falls Church', 'VA', 38.8823, -77.1711),
  ('geneva-il', 'Geneva', 'IL', 41.8875, -88.3054),
  ('glenwood-md', 'Glenwood', 'MD', 39.2607, -77.0258),
  ('grafton-ma', 'Grafton', 'MA', 42.2079, -71.6856),
  ('grand-junction-co', 'Grand Junction', 'CO', 39.0639, -108.5506),
  ('harrisonburg-va', 'Harrisonburg', 'VA', 38.4496, -78.8689),
  ('hartwell-ga', 'Hartwell', 'GA', 34.3526, -82.9326),
  ('honolulu-hi', 'Honolulu', 'HI', 21.3069, -157.8583),
  ('lakeland-fl', 'Lakeland', 'FL', 28.0395, -81.9498),
  ('laramie-wy', 'Laramie', 'WY', 41.3114, -105.5911),
  ('las-colinas-tx', 'Las Colinas', 'TX', 32.872, -96.9469),
  ('lawrence-ks', 'Lawrence', 'KS', 38.9717, -95.2353),
  ('lawrenceville-nj', 'Lawrenceville', 'NJ', 40.297, -74.7294),
  ('lewes-de', 'Lewes', 'DE', 38.7746, -75.139),
  ('long-beach-ca', 'Long Beach', 'CA', 33.7701, -118.1937),
  ('los-angeles-ca', 'Los Angeles', 'CA', 34.0522, -118.2437),
  ('madison-al', 'Madison', 'AL', 34.6993, -86.7483),
  ('madison-wi', 'Madison', 'WI', 43.0731, -89.4012),
  ('mclean-va', 'McLean', 'VA', 38.9339, -77.1773),
  ('milwaukee-wi', 'Milwaukee', 'WI', 43.0389, -87.9065),
  ('montgomery-al', 'Montgomery', 'AL', 32.3668, -86.2999),
  ('naperville-il', 'Naperville', 'IL', 41.7508, -88.1535),
  ('nellysford-va', 'Nellysford', 'VA', 37.8954, -78.8997),
  ('new-york-ny', 'New York', 'NY', 40.7128, -74.006),
  ('northampton-ma', 'Northampton', 'MA', 42.3251, -72.6412),
  ('oakland-ca', 'Oakland', 'CA', 37.8044, -122.2712),
  ('oro-valley-az', 'Oro Valley', 'AZ', 32.3909, -110.9665),
  ('oxford-ms', 'Oxford', 'MS', 34.3665, -89.5193),
  ('ozark-mo', 'Ozark', 'MO', 37.0209, -93.2058),
  ('pacifica-ca', 'Pacifica', 'CA', 37.6138, -122.4869),
  ('paducah-ky', 'Paducah', 'KY', 37.0834, -88.6),
  ('palm-springs-ca', 'Palm Springs', 'CA', 33.8303, -116.5453),
  ('pitman-nj', 'Pitman', 'NJ', 39.7329, -75.1313),
  ('pittsfield-township-mi', 'Pittsfield Township', 'MI', 42.2236, -83.7341),
  ('port-angeles-wa', 'Port Angeles', 'WA', 48.1181, -123.4307),
  ('portland-or', 'Portland', 'OR', 45.5152, -122.6784),
  ('radnor-pa', 'Radnor', 'PA', 40.0459, -75.3596),
  ('raleigh-nc', 'Raleigh', 'NC', 35.7796, -78.6382),
  ('reston-va', 'Reston', 'VA', 38.9586, -77.357),
  ('roanoke-va', 'Roanoke', 'VA', 37.271, -79.9414),
  ('rosendale-ny', 'Rosendale', 'NY', 41.8434, -74.0793),
  ('round-rock-tx', 'Round Rock', 'TX', 30.5083, -97.6789),
  ('saint-paul-mn', 'Saint Paul', 'MN', 44.9537, -93.09),
  ('san-diego-ca', 'San Diego', 'CA', 32.7157, -117.1611),
  ('san-francisco-ca', 'San Francisco', 'CA', 37.7749, -122.4194),
  ('san-jose-ca', 'San Jose', 'CA', 37.3382, -121.8863),
  ('santa-barbara-ca', 'Santa Barbara', 'CA', 34.4208, -119.6982),
  ('seattle-wa', 'Seattle', 'WA', 47.6062, -122.3321),
  ('silver-spring-md', 'Silver Spring', 'MD', 38.9907, -77.0261),
  ('skokie-il', 'Skokie', 'IL', 42.0334, -87.7334),
  ('somerville-ma', 'Somerville', 'MA', 42.3876, -71.0995),
  ('south-bend-in', 'South Bend', 'IN', 41.6764, -86.252),
  ('staunton-va', 'Staunton', 'VA', 38.1496, -79.0717),
  ('tacoma-wa', 'Tacoma', 'WA', 47.2529, -122.4443),
  ('upper-makefield-pa', 'Upper Makefield', 'PA', 40.295, -74.9329),
  ('vass-nc', 'Vass', 'NC', 35.2552, -79.2792),
  ('vero-beach-fl', 'Vero Beach', 'FL', 27.6386, -80.3973),
  ('washington-dc', 'Washington', 'DC', 38.9072, -77.0369),
  ('west-sacramento-ca', 'West Sacramento', 'CA', 38.5805, -121.5302),
  ('white-river-junction-vt', 'White River Junction', 'VT', 43.6489, -72.3192),
  ('williamsburg-va', 'Williamsburg', 'VA', 37.2707, -76.7075),
  ('wilmington-de', 'Wilmington', 'DE', 39.7391, -75.5398)
ON CONFLICT DO NOTHING;

-- Update communities with coarse coords / intl labels
UPDATE public.communities SET coarse_latitude = 37.7749, coarse_longitude = -122.4194 WHERE slug = 'sunset-richmond';
UPDATE public.communities SET coarse_latitude = 37.7749, coarse_longitude = -122.4194 WHERE slug = 'mission-district-sharing';
UPDATE public.communities SET coarse_latitude = 38.9686, coarse_longitude = -77.0786 WHERE slug = 'chevy-chase-share';
UPDATE public.communities SET coarse_latitude = 38.1496, coarse_longitude = -79.0717 WHERE slug = 'baldwin-acres';
UPDATE public.communities SET coarse_latitude = 35.9101, coarse_longitude = -79.0753 WHERE slug = 'cedars-of-carrboro';
UPDATE public.communities SET coarse_latitude = 38.8048, coarse_longitude = -77.0469 WHERE slug = 'parkfairfax-sharing-community';
UPDATE public.communities SET coarse_latitude = 38.9072, coarse_longitude = -77.0369 WHERE slug = 'f-st-ne';
UPDATE public.communities SET coarse_latitude = 30.2672, coarse_longitude = -97.7431 WHERE slug = 'oldham-neighbors';
UPDATE public.communities SET coarse_latitude = 38.8307, coarse_longitude = -77.1964 WHERE slug = 'sleepy-hollow-woods-sharing-annandale-community-supplies';
UPDATE public.communities SET coarse_latitude = 33.8303, coarse_longitude = -116.5453 WHERE slug = 'oasis-del-sol';
UPDATE public.communities SET coarse_latitude = 39.339, coarse_longitude = -94.2261 WHERE slug = '158th-street-neighbors';
UPDATE public.communities SET coarse_latitude = 32.872, coarse_longitude = -96.9469 WHERE slug = 'las-colinas-irving-tx';
UPDATE public.communities SET coarse_latitude = 35.7915, coarse_longitude = -78.7811 WHERE slug = 'wellington-shares';
UPDATE public.communities SET coarse_latitude = 28.0395, coarse_longitude = -81.9498 WHERE slug = 'sandpiper-golf-country-club';
UPDATE public.communities SET coarse_latitude = 38.8339, coarse_longitude = -104.8214 WHERE slug = 'cha-cha-neighborhood';
UPDATE public.communities SET coarse_latitude = 38.9586, coarse_longitude = -77.357 WHERE slug = 'thrush-ridge';
UPDATE public.communities SET coarse_latitude = 34.3665, coarse_longitude = -89.5193 WHERE slug = 'south-oakssouth-lamar';
UPDATE public.communities SET coarse_latitude = 38.5632, coarse_longitude = -76.0788 WHERE slug = 'blackwater-rising-sharing-community';
UPDATE public.communities SET coarse_latitude = 47.9789, coarse_longitude = -122.2021 WHERE slug = 'washington-oakes';
UPDATE public.communities SET coarse_latitude = 38.5805, coarse_longitude = -121.5302 WHERE slug = 'west-sacramento-river-district';
UPDATE public.communities SET intl_label = 'Lubin, Poland' WHERE slug = 'osiek-k-lubina';
UPDATE public.communities SET coarse_latitude = 38.8799, coarse_longitude = -77.1067 WHERE slug = 'shirlington-crest';
UPDATE public.communities SET coarse_latitude = 43.0731, coarse_longitude = -89.4012 WHERE slug = 'westmorland';
UPDATE public.communities SET coarse_latitude = 47.2529, coarse_longitude = -122.4443 WHERE slug = 'tacoma-north-end';
UPDATE public.communities SET coarse_latitude = 37.3382, coarse_longitude = -121.8863 WHERE slug = 'willow-glen';
UPDATE public.communities SET coarse_latitude = 39.7392, coarse_longitude = -104.9903 WHERE slug = 'poplar-st-neighbors';
UPDATE public.communities SET intl_label = 'London, UK' WHERE slug = 'pilgrims-to-willoughby-residents-association';
UPDATE public.communities SET coarse_latitude = 39.2607, coarse_longitude = -77.0258 WHERE slug = 'western-howard-county';
UPDATE public.communities SET coarse_latitude = 39.0639, coarse_longitude = -108.5506 WHERE slug = 'the-redlands-in-gj';
UPDATE public.communities SET coarse_latitude = 38.9686, coarse_longitude = -77.0786 WHERE slug = 'rollingwoodchevy-chase';
UPDATE public.communities SET coarse_latitude = 37.8954, coarse_longitude = -78.8997 WHERE slug = 'glenthorne-loop-sharing-community';
UPDATE public.communities SET coarse_latitude = 42.5584, coarse_longitude = -70.88 WHERE slug = 'beverly-ma';
UPDATE public.communities SET coarse_latitude = 43.1284, coarse_longitude = -77.5697 WHERE slug = 'brighton-ny';
UPDATE public.communities SET coarse_latitude = 41.8781, coarse_longitude = -87.6298 WHERE slug = 'rogers-neighborhood-sharing';
UPDATE public.communities SET coarse_latitude = 37.2707, coarse_longitude = -76.7075 WHERE slug = 'kingsmill';
UPDATE public.communities SET coarse_latitude = 45.5152, coarse_longitude = -122.6784 WHERE slug = 'garden-home-pdx';
UPDATE public.communities SET coarse_latitude = 42.0334, coarse_longitude = -87.7334 WHERE slug = 'skevanston';
UPDATE public.communities SET coarse_latitude = 41.8875, coarse_longitude = -88.3054 WHERE slug = 'natwill-square-homeowners-association';
UPDATE public.communities SET coarse_latitude = 34.3526, coarse_longitude = -82.9326 WHERE slug = 'hartwell-milltown';
UPDATE public.communities SET coarse_latitude = 41.14, coarse_longitude = -104.8202 WHERE slug = 'north-cheyenne-neighbors-share-stuff';
UPDATE public.communities SET intl_label = 'Aude, France' WHERE slug = 'cabrespine';
UPDATE public.communities SET coarse_latitude = 38.928, coarse_longitude = -76.9158 WHERE slug = 'cheverly-shares';
UPDATE public.communities SET coarse_latitude = 32.3909, coarse_longitude = -110.9665 WHERE slug = 'lantern-way-neighborhood';
UPDATE public.communities SET coarse_latitude = 43.0389, coarse_longitude = -87.9065 WHERE slug = 'sherman-park';
UPDATE public.communities SET coarse_latitude = 44.9537, coarse_longitude = -93.09 WHERE slug = 'desnoyers-park';
UPDATE public.communities SET coarse_latitude = 37.0834, coarse_longitude = -88.6 WHERE slug = 'lower-town-historic-arts-district';
UPDATE public.communities SET coarse_latitude = 38.4496, coarse_longitude = -78.8689 WHERE slug = 'harrisonburg-ashby-meadows';
UPDATE public.communities SET coarse_latitude = 39.0068, coarse_longitude = -76.7791 WHERE slug = 'bowie-20715';
UPDATE public.communities SET coarse_latitude = 39.7391, coarse_longitude = -75.5398 WHERE slug = 'triangle-neighborhood';
UPDATE public.communities SET coarse_latitude = 34.6993, coarse_longitude = -86.7483 WHERE slug = 'windermere';
UPDATE public.communities SET coarse_latitude = 39.2904, coarse_longitude = -76.6122 WHERE slug = 'glendale-community';
UPDATE public.communities SET coarse_latitude = 38.9339, coarse_longitude = -77.1773 WHERE slug = 'langley-oaks';
UPDATE public.communities SET coarse_latitude = 33.7701, coarse_longitude = -118.1937 WHERE slug = 'long-beach-lending';
UPDATE public.communities SET coarse_latitude = 41.3114, coarse_longitude = -105.5911 WHERE slug = 'undine-neighbors-friends';
UPDATE public.communities SET coarse_latitude = 34.0522, coarse_longitude = -118.2437 WHERE slug = 'park-labrea';
UPDATE public.communities SET coarse_latitude = 37.0209, coarse_longitude = -93.2058 WHERE slug = 'ozark-mo';
UPDATE public.communities SET coarse_latitude = 38.9586, coarse_longitude = -77.357 WHERE slug = 'glade-bank-cluster';
UPDATE public.communities SET coarse_latitude = 21.3069, coarse_longitude = -157.8583 WHERE slug = 'halehoola-community';
UPDATE public.communities SET coarse_latitude = 42.3876, coarse_longitude = -71.0995 WHERE slug = 'lexington-avenue';
UPDATE public.communities SET coarse_latitude = 32.7157, coarse_longitude = -117.1611 WHERE slug = 'mira-mesa';
UPDATE public.communities SET coarse_latitude = 34.4208, coarse_longitude = -119.6982 WHERE slug = 'westwood-oaks';
UPDATE public.communities SET coarse_latitude = 39.2673, coarse_longitude = -76.7983 WHERE slug = 'ellicott-city';
UPDATE public.communities SET coarse_latitude = 38.9072, coarse_longitude = -77.0369 WHERE slug = 'adams-morgan-washington-dc';
UPDATE public.communities SET coarse_latitude = 41.8434, coarse_longitude = -74.0793 WHERE slug = 'rosendale-shares';
UPDATE public.communities SET coarse_latitude = 39.7392, coarse_longitude = -104.9903 WHERE slug = 'west-colfax-denver';
UPDATE public.communities SET intl_label = 'Bangalore, India' WHERE slug = 'hsr-layout';
UPDATE public.communities SET coarse_latitude = 42.8864, coarse_longitude = -78.8784 WHERE slug = 'elmwood-village';
UPDATE public.communities SET coarse_latitude = 35.2552, coarse_longitude = -79.2792 WHERE slug = 'horse-country-lending';
UPDATE public.communities SET intl_label = 'Melbourne, Australia' WHERE slug = 'northcote-community-supplies';
UPDATE public.communities SET coarse_latitude = 39.7392, coarse_longitude = -104.9903 WHERE slug = 'denver-downtown';
UPDATE public.communities SET coarse_latitude = 40.6782, coarse_longitude = -73.9442 WHERE slug = 'bococa-brooklyn-community-share';
UPDATE public.communities SET intl_label = 'Coventry, UK' WHERE slug = 'earlsdon';
UPDATE public.communities SET intl_label = 'Tijuana, Mexico' WHERE slug = 'ciclicas';
UPDATE public.communities SET intl_label = 'London, UK' WHERE slug = 'gladstone-place-residents';
UPDATE public.communities SET coarse_latitude = 38.9072, coarse_longitude = -77.0369 WHERE slug = 'capitol-hill';
UPDATE public.communities SET coarse_latitude = 37.271, coarse_longitude = -79.9414 WHERE slug = 'roanoke';
UPDATE public.communities SET coarse_latitude = 35.994, coarse_longitude = -78.8986 WHERE slug = 'old-east-durham';
UPDATE public.communities SET coarse_latitude = 38.8799, coarse_longitude = -77.1067 WHERE slug = 'wilde-oaks';
UPDATE public.communities SET intl_label = 'Ontario, Canada' WHERE slug = 'rondeau-cottagers';
UPDATE public.communities SET coarse_latitude = 40.297, coarse_longitude = -74.7294 WHERE slug = 'white-pine-community-sharing';
UPDATE public.communities SET coarse_latitude = 38.9072, coarse_longitude = -77.0369 WHERE slug = 'brookland-dc-sharing';
UPDATE public.communities SET coarse_latitude = 42.2079, coarse_longitude = -71.6856 WHERE slug = 'grafton-shares';
UPDATE public.communities SET coarse_latitude = 40.0459, coarse_longitude = -75.3596 WHERE slug = 'radnor-pa';
UPDATE public.communities SET coarse_latitude = 43.6489, coarse_longitude = -72.3192 WHERE slug = 'vermont-center-for-ecostudies';
UPDATE public.communities SET coarse_latitude = 30.5083, coarse_longitude = -97.6789 WHERE slug = 'chandler-creek';
UPDATE public.communities SET coarse_latitude = 32.7157, coarse_longitude = -117.1611 WHERE slug = 'south-park-san-diego';
UPDATE public.communities SET coarse_latitude = 41.8781, coarse_longitude = -87.6298 WHERE slug = 'jefferson-park';
UPDATE public.communities SET coarse_latitude = 38.9573, coarse_longitude = -76.6311 WHERE slug = 'riverwood';
UPDATE public.communities SET coarse_latitude = 43.0731, coarse_longitude = -89.4012 WHERE slug = 'bwsd-baldwin-wilson-schley-dewey';
UPDATE public.communities SET coarse_latitude = 48.1181, coarse_longitude = -123.4307 WHERE slug = 'sunrise-heights';
UPDATE public.communities SET intl_label = 'Mexico City, Mexico' WHERE slug = 'circular-de-morelia-vecinos';
UPDATE public.communities SET coarse_latitude = 37.7749, coarse_longitude = -122.4194 WHERE slug = 'noe-valley-shared-supplies';
UPDATE public.communities SET coarse_latitude = 42.2236, coarse_longitude = -83.7341 WHERE slug = 'golfside-heights';
UPDATE public.communities SET coarse_latitude = 41.7508, coarse_longitude = -88.1535 WHERE slug = 'west-highlands';
UPDATE public.communities SET coarse_latitude = 37.8044, coarse_longitude = -122.2712 WHERE slug = 'laurel-district';
UPDATE public.communities SET coarse_latitude = 40.295, coarse_longitude = -74.9329 WHERE slug = 'umtbridlewoodfarms';
UPDATE public.communities SET coarse_latitude = 40.6782, coarse_longitude = -73.9442 WHERE slug = 'prospect-heights';
UPDATE public.communities SET coarse_latitude = 37.6138, coarse_longitude = -122.4869 WHERE slug = 'pacifica-community';
UPDATE public.communities SET coarse_latitude = 35.7796, coarse_longitude = -78.6382 WHERE slug = 'nw-raleigh-community-shares';
UPDATE public.communities SET coarse_latitude = 27.6386, coarse_longitude = -80.3973 WHERE slug = 'vero-beach';
UPDATE public.communities SET coarse_latitude = 42.3251, coarse_longitude = -72.6412 WHERE slug = 'foxy-park-neighborhood';
UPDATE public.communities SET coarse_latitude = 38.8048, coarse_longitude = -77.0469 WHERE slug = 'ne-neighborhood';
UPDATE public.communities SET coarse_latitude = 38.8823, coarse_longitude = -77.1711 WHERE slug = 'sigmona-pinewood-community';
UPDATE public.communities SET intl_label = 'Amsterdam, Netherlands' WHERE slug = 'ams-sharing';
UPDATE public.communities SET coarse_latitude = 32.3668, coarse_longitude = -86.2999 WHERE slug = 'carol-villa-civic-association';
UPDATE public.communities SET intl_label = 'Johannesburg, South Africa' WHERE slug = 'observatory';
UPDATE public.communities SET coarse_latitude = 37.7749, coarse_longitude = -122.4194 WHERE slug = 'nopa-community-supplies';
UPDATE public.communities SET coarse_latitude = 39.7329, coarse_longitude = -75.1313, description = 'Pitman, NJ' WHERE slug = 'pitman-sharing-community';
UPDATE public.communities SET coarse_latitude = 38.9072, coarse_longitude = -77.0369 WHERE slug = 'rez-sharing-community';
UPDATE public.communities SET coarse_latitude = 41.8781, coarse_longitude = -87.6298 WHERE slug = 'kenmore-shares';
UPDATE public.communities SET coarse_latitude = 42.3732, coarse_longitude = -72.5199 WHERE slug = 'amherst-college';
UPDATE public.communities SET intl_label = 'Toronto, Canada' WHERE slug = 'kml';
UPDATE public.communities SET coarse_latitude = 38.8462, coarse_longitude = -77.3064 WHERE slug = 'covington-fairfax-va';
UPDATE public.communities SET coarse_latitude = 37.7749, coarse_longitude = -122.4194 WHERE slug = 'the-wiggle-tool-sharing';
UPDATE public.communities SET coarse_latitude = 38.8799, coarse_longitude = -77.1067 WHERE slug = 'top-of-tara';
UPDATE public.communities SET coarse_latitude = 37.7749, coarse_longitude = -122.4194 WHERE slug = 'sf-mission-bernal-heights-noe-potrero-glen-park';
UPDATE public.communities SET coarse_latitude = 38.7746, coarse_longitude = -75.139 WHERE slug = 'governers-sharing-network';
UPDATE public.communities SET coarse_latitude = 42.3876, coarse_longitude = -71.0995 WHERE slug = 'mamas';
UPDATE public.communities SET coarse_latitude = 41.8781, coarse_longitude = -87.6298 WHERE slug = 'west-logan-square-chicago';
UPDATE public.communities SET coarse_latitude = 44.5646, coarse_longitude = -123.262 WHERE slug = 'jana-corvallis';
UPDATE public.communities SET coarse_latitude = 39.1817, coarse_longitude = -77.0578 WHERE slug = 'tanterra';
UPDATE public.communities SET coarse_latitude = 38.9907, coarse_longitude = -77.0261 WHERE slug = 'dartmouth-greenwich-windsor';
UPDATE public.communities SET coarse_latitude = 47.6062, coarse_longitude = -122.3321 WHERE slug = 'columbia-city-neighbors-club';
UPDATE public.communities SET coarse_latitude = 40.7128, coarse_longitude = -74.006 WHERE slug = 'hells-kitchen';
UPDATE public.communities SET coarse_latitude = 41.6764, coarse_longitude = -86.252 WHERE slug = 'george-garner';
UPDATE public.communities SET coarse_latitude = 37.8715, coarse_longitude = -122.273 WHERE slug = 'san-pablo-park';
UPDATE public.communities SET coarse_latitude = 38.9717, coarse_longitude = -95.2353 WHERE slug = 'april-showers';
UPDATE public.communities SET coarse_latitude = 37.8044, coarse_longitude = -122.2712 WHERE slug = 'lawton-street';