# Status Quo

The current event app is a laravel application that i am hosting on Coolify. The database is postgres, like our current app, but the schema is different.

# Requirement

We want a mechanism to be able to migrate the current data into our new app, with no data loss. The current application will receive no further changes, so the schema is fixed on the old database. The "New" application is still in development, so we want something like a script that i can run to migrate the data across for testing, when the new app is ready i can just switch the apps and users will basically just see the new site with the same data.

## Users

We want to migrate all users, the only problem i see here is if passwords will need to be reset, but that is also not a huge problem. Another issue i see is if we can migrate ids 1:1, or if we will need to hash them somehow.

## Events

We want to migrate all events, with all the associations that we also have:

- user
- schedule (in the old app we did not have geolocation, so this needs a good strategy)
- pictures (we use cloudflare R2 for the old site too, so that shouldnt be a problem, we want to copy pictures across to the "new" R2 bucket, so the "old" one stays as is)
