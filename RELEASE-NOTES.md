# Bean Ledger - Release Notes

## Version 1.2.0 - December 7, 2025

### 🎉 New Features

#### Quick Roast Scheduling
- Added "Roast" button next to each green coffee item in inventory
- Enables quick navigation to schedule roasts directly from inventory view
- Streamlines workflow for planning roasts based on available green coffee

#### Temperature Unit Preferences
- Users can now choose between Celsius and Fahrenheit in Settings
- Temperature preferences apply across all roasting forms
- Dynamic temperature labels update based on user preference
- Default unit is Celsius

#### Mobile & Responsive Design
- **Mobile Navigation**: New hamburger menu for mobile devices
- **Responsive Layouts**: All pages now adapt to mobile, tablet, and desktop screens
- **Optimized Stats Cards**: Better presentation on smaller screens
- **Icon-only Navigation**: Space-efficient navigation on smaller desktop screens
- **Flexible Button Layouts**: Buttons wrap appropriately on mobile devices

### 🐛 Bug Fixes

#### Inventory System
- Fixed duplicate roasted coffee entries when adjusting inventory upward
- Removed "(Corrected XXXXXXXXXX)" suffixes from coffee names
- Fixed roast form dropdown to show clean coffee names
- Database cleanup scripts applied to remove old corrupted entries

#### UI/UX Improvements
- Removed debug buttons from inventory dashboard
- Fixed duplicate batch planners on schedule page
- Added 10g brewing option for roasted coffee consumption
- Improved visual consistency across dashboard and schedule pages

### 🔧 Technical Improvements

#### Database Migrations
- **Migration 020**: Fixed roasted inventory calculation to include adjustments
- **Migration 021**: Reverted to simpler, working inventory function using array_agg
- **Migration 022**: Updated trigger validation to accept roasted_adjustment action type
- All migrations tested and ready for production deployment

#### Code Organization
- Organized SQL cleanup scripts into `scripts/cleanup/`
- Moved documentation to `docs/` directory
- Archived completed task docs for reference
- Added comprehensive README files

#### Responsive Design System
- Implemented Tailwind CSS breakpoints (sm, md, lg, xl)
- Mobile-first approach for all new components
- Consistent spacing and padding across screen sizes
- Better text sizing with responsive typography

### 📊 Performance

- Optimized inventory loading with better query structure
- Reduced database round trips for schedule data
- Improved component rendering with better state management

### 🎨 UI Enhancements

- Enhanced page headers with responsive layouts
- Better button spacing and alignment
- Improved card layouts for mobile devices
- More polished visual hierarchy

### 📝 Documentation

- Created comprehensive task status tracker
- Updated migration documentation
- Added repository organization guides
- Documented recent changes and impacts

---

## Version 1.1.0 - Previous Release

### Features
- Initial inventory management system
- Roast scheduling and tracking
- Equipment management
- AI-powered brewing recommendations
- Analytics and reporting

---

## Upgrade Notes

### Database Migrations Required
If upgrading from version 1.1.0, apply the following migrations in order:
1. `020_fix_roasted_inventory_with_adjustments.sql`
2. `021_revert_to_working_roasted_inventory.sql`
3. `022_add_roasted_adjustment_to_trigger.sql`

### Configuration Changes
- New user preference field: `temperature_unit` (defaults to 'celsius')
- Ensure user_preferences table supports this field

### Breaking Changes
- None in this release

---

## Known Issues

- Help center & FAQ update in progress
- Some AI prompts need to be made equipment-agnostic

---

## Coming Soon

### High Priority
- All high priority tasks completed! 🎉

### Medium Priority
- Enhanced help center & FAQ

### Feature Requests
- AI picture analysis for coffee quality assessment
- ChronoRoast timer integration
- Equipment-agnostic AI prompts
- Simplified brewing form options

---

## Statistics

- **Tasks Completed**: 10
- **Bugs Fixed**: 4
- **New Features**: 3
- **UI Improvements**: 8
- **Completion Rate**: 62% of planned tasks

---

## Contributors

- Claude Sonnet 4.5 (AI Development Assistant)
- Bean Ledger Development Team

---

## Feedback & Support

For bug reports, feature requests, or support:
- Open an issue on GitHub
- Contact the development team
- Check the help center for common questions

---

**Thank you for using Bean Ledger!** ☕
