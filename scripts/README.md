# WordPress Posts Migration Scripts

This directory contains scripts to migrate WordPress posts to The Cliff News database.

## Files

- `migrate-posts.js` - Main migration script
- `analyze-wordpress-data.js` - Analysis script for WordPress data
- `posts.json` - WordPress posts data (should be placed in parent directory)

## Prerequisites

1. Ensure your database is set up and Prisma is configured
2. Run `npm install` to install dependencies
3. Run `npx prisma generate` to generate Prisma client
4. Place your `posts.json` file in the parent directory (`../posts.json`)

## Usage

### Step 1: Analyze WordPress Data

First, analyze your WordPress data to understand the structure:

```bash
cd scripts
node analyze-wordpress-data.js
```

This will:

- Show statistics about your WordPress posts
- Identify categories, tags, and authors
- Generate mapping suggestions
- Save analysis to `wordpress-analysis.json`

### Step 2: Update Category and Tag Mappings

Edit `migrate-posts.js` and update the mapping objects:

```javascript
// Update these mappings based on your analysis
const CATEGORY_MAPPING = {
  51: "politics", // WordPress category ID -> your category slug
  54: "entertainment",
  258: "sports",
};

const TAG_MAPPING = {
  120: "breaking-news", // WordPress tag ID -> your tag name
  219: "entertainment",
};
```

### Step 3: Create Sample Categories and Tags (Optional)

If you want to create sample categories and tags first:

```bash
node migrate-posts.js create-mapping
```

### Step 4: Run Migration

Migrate the posts to your database:

```bash
node migrate-posts.js migrate
```

## Migration Process

The migration script will:

1. **Create Default Author**: Creates a default author for migrated posts
2. **Create Default Category**: Creates a "General" category for posts without categories
3. **Process Each Post**:
   - Skip unpublished posts
   - Extract title, content, excerpt, dates
   - Map categories and tags
   - Create article records
   - Link tags to articles
4. **Handle Duplicates**: Skip posts that already exist (based on slug)

## Data Mapping

### WordPress → Database

| WordPress Field    | Database Field        | Notes                        |
| ------------------ | --------------------- | ---------------------------- |
| `title.rendered`   | `title`               | Post title                   |
| `slug`             | `slug`                | URL slug                     |
| `content.rendered` | `content`             | Full post content            |
| `excerpt.rendered` | `excerpt`             | Post excerpt (HTML stripped) |
| `date`             | `publishedAt`         | Publication date             |
| `modified`         | `updatedAt`           | Last modified date           |
| `status`           | `status`              | Mapped to PUBLISHED/DRAFT    |
| `categories`       | `categoryId`          | Mapped via CATEGORY_MAPPING  |
| `tags`             | `tags` + `ArticleTag` | Mapped via TAG_MAPPING       |

### Default Values

- **Author**: Creates "Migrated Author" if not exists
- **Category**: Uses "General" category for unmapped categories
- **Language**: Defaults to ENGLISH
- **Status**: Maps "publish" to PUBLISHED, others to DRAFT
- **Read Time**: Estimated based on word count (200 words/minute)

## Post-Migration Tasks

After migration, you should:

1. **Update Author Password**: Change the default author password
2. **Review Categories**: Check if category mappings are correct
3. **Review Tags**: Verify tag mappings and create missing tags
4. **Update Featured Images**: Handle featured media if needed
5. **Test Articles**: Verify posts display correctly on your website

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure DATABASE_URL is set in your environment
2. **Prisma Client**: Run `npx prisma generate` if you get Prisma client errors
3. **File Path**: Ensure `posts.json` is in the correct location
4. **Permissions**: Ensure the script has write permissions for the database

### Error Handling

The script includes error handling for:

- Duplicate posts (skipped)
- Invalid dates (uses current date)
- Missing categories (uses default)
- Database connection issues

### Logs

The script provides detailed logging:

- Progress updates for each post
- Error messages for failed migrations
- Final statistics (success/error counts)

## Customization

You can customize the migration by modifying:

1. **Category Mapping**: Update `CATEGORY_MAPPING` object
2. **Tag Mapping**: Update `TAG_MAPPING` object
3. **Default Author**: Modify `DEFAULT_AUTHOR` object
4. **Default Category**: Modify `DEFAULT_CATEGORY` object
5. **Language Detection**: Add logic to detect post language
6. **Featured Images**: Add logic to handle featured media

## Example Output

```
Starting WordPress posts migration...
Found 100 posts to migrate
Created default author for migrated posts
Created default category for migrated posts
Migrated: Fan Buys Pawan Kalyan's "They Call Him OG" Benefit Show Ticket for ₹1.29 Lakh
Migrated: Another Post Title
...

Migration completed!
Successfully migrated: 95 posts
Errors: 5 posts
```
