# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Créno is a React Native/Expo event planning application built with TypeScript, Firebase, and React Navigation. The app allows users to manage group events, track availability, and coordinate schedules through an intuitive calendar interface.

## Development Commands

### Basic Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run web version

### Building & Deployment
- `eas build --platform ios --profile preview` - Build iOS preview
- `eas build --platform android --profile preview` - Build Android preview
- `eas build --platform all --profile production` - Production builds
- `eas submit --platform ios` - Submit to App Store
- `eas submit --platform android` - Submit to Play Store

## Architecture & Key Concepts

### Core Data Model
The app centers around these main entities:
- **Groups**: Central organizing unit for events and users
- **Events**: Scheduled activities with participants and time slots
- **Availabilities**: User availability/unavailability periods
- **Users**: App users with group memberships

### Screen Organization
- **Agenda Tab (`AvailabilityScreen`)**: Personal calendar showing only user's events and managing availability
- **Group Tab (`FriendsScreen`)**: Group-wide calendar showing all group events
- **Events Tab (`MyEventsScreen`)**: List view of user's events

### Firebase Integration
- **Authentication**: Firebase Auth with React Native persistence
- **Database**: Firestore with real-time listeners (`onSnapshot`)
- **Notifications**: Expo notifications with Firebase Cloud Messaging

### Calendar System
Uses `react-native-calendars` with custom marker logic:
- **Yellow circles**: Events (solid background for agenda, outline for group view)
- **Blue circles**: Unavailabilities (solid background)
- **Mixed markers**: Yellow circle with blue border when both event and unavailability exist

### Conflict Prevention System
Documented in `CONFLICT_PREVENTION.md`. Key utilities:
- `src/utils/conflictChecker.ts`: Detects scheduling conflicts
- `src/utils/slotFinder.ts`: Finds available time slots avoiding conflicts

## Theme System
Centralized in `src/theme/colors.ts` with brand colors:
- **Primary**: `#1A3B5C` (Navy blue)
- **Secondary**: `#FFB800` (Golden yellow)
- Uses semantic color names (`textPrimary`, `surface`, etc.)

## State Management Patterns

### Real-time Data Sync
Uses Firebase `onSnapshot` listeners in `useEffect` hooks with cleanup:
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    // Process data
  });
  return unsubscribe;
}, [dependencies]);
```

### Refresh Triggers
Uses `refreshTrigger` state pattern for manual data refreshes:
```typescript
const [refreshTrigger, setRefreshTrigger] = useState(0);
// Trigger refresh: setRefreshTrigger(prev => prev + 1)
```

### Navigation Focus Listeners
Refreshes data when navigating between tabs:
```typescript
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    setRefreshTrigger(prev => prev + 1);
  });
  return unsubscribe;
}, [navigation]);
```

## Calendar Marker Logic

### Data Combination Strategy
Each screen combines multiple data sources for calendar markers:
1. Load events and availabilities separately
2. Create markers for each data type
3. Combine using intelligent merging logic
4. Handle conflicts with priority rules

### Marker Refresh Pattern
When data changes, markers must be recombined:
- Events and availabilities are loaded independently
- Combined in `setMarkedDates` with custom logic
- Refreshed when navigating between tabs

## Key Files & Responsibilities

### Core Navigation
- `App.tsx`: Main navigation setup, auth state management
- `src/navigation/CustomTabBar.tsx`: Custom bottom tab navigation

### Utilities
- `src/utils/conflictChecker.ts`: Event conflict detection
- `src/utils/slotFinder.ts`: Available time slot finding
- `src/services/notificationService.ts`: Push notification handling

### Shared Hooks
- `src/hooks/useCurrentGroup.ts`: Current group state management

### Feature Screens
- `src/features/field/`: Event and calendar management screens
- `src/features/profile/`: User profile and settings screens
- `src/features/auth/`: Authentication screens

## Development Notes

### Calendar Marker Updates
When modifying calendar displays, ensure both agenda and group views are updated consistently. They use different files but similar logic patterns.

### Firebase Queries
Always include proper error handling and loading states for Firebase operations. Use `onSnapshot` for real-time data, not one-time `getDocs`.

### Color Usage
Always use theme colors from `src/theme/colors.ts` rather than hardcoded hex values for consistency.

### Notification Permissions
The app requires notification permissions for event alerts. Handle permission flows gracefully with proper fallbacks.