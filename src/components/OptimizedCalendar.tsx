import React, { memo, useMemo } from 'react';
import { Calendar, CalendarProps } from 'react-native-calendars';
import { areMarkedDatesEqual } from '../utils/performanceOptimizer';

interface OptimizedCalendarProps extends Partial<CalendarProps> {
  markedDates?: any;
  onDayPress?: (day: any) => void;
  currentDate?: string;
}

/**
 * Composant Calendar optimisé avec mémoisation
 * Évite les re-renders inutiles en comparant les props
 */
export const OptimizedCalendar = memo<OptimizedCalendarProps>(({
  markedDates = {},
  onDayPress,
  currentDate,
  ...otherProps
}) => {
  // Theme mémorisé pour éviter les recréations
  const theme = useMemo(() => ({
    backgroundColor: '#FFFFFF',
    calendarBackground: '#FFFFFF',
    textSectionTitleColor: '#1A3B5C',
    selectedDayBackgroundColor: '#FFB800',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#FFB800',
    dayTextColor: '#1A3B5C',
    textDisabledColor: '#D3D3D3',
    dotColor: '#FFB800',
    selectedDotColor: '#FFFFFF',
    arrowColor: '#FFB800',
    monthTextColor: '#1A3B5C',
    indicatorColor: '#FFB800',
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontWeight: '400' as const,
    textMonthFontWeight: '700' as const,
    textDayHeaderFontWeight: '600' as const,
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  }), []);

  // Date actuelle mémorisée
  const current = useMemo(() => {
    return currentDate || new Date().toISOString().split('T')[0];
  }, [currentDate]);

  return (
    <Calendar
      current={current}
      markedDates={markedDates}
      onDayPress={onDayPress}
      theme={theme}
      enableSwipeMonths={true}
      showScrollIndicator={false}
      firstDay={1}
      hideExtraDays={true}
      markingType="custom"
      // Optimisations supplémentaires
      initialDate={current}
      minDate={undefined}
      maxDate={undefined}
      hideArrows={false}
      renderArrow={(direction) => (
        <Text style={{ fontSize: 18, color: '#FFB800' }}>
          {direction === 'left' ? '‹' : '›'}
        </Text>
      )}
      monthFormat={'MMMM yyyy'}
      hideDayNames={false}
      showWeekNumbers={false}
      disableMonthChange={false}
      disableArrowLeft={false}
      disableArrowRight={false}
      disableAllTouchEventsForDisabledDays={true}
      // Optimisation de la performance
      removeClippedSubviews={true}
      {...otherProps}
    />
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders
  // Ne re-render que si les markedDates ont vraiment changé
  if (!areMarkedDatesEqual(prevProps.markedDates, nextProps.markedDates)) {
    return false;
  }
  
  // Vérifier les autres props importantes
  if (prevProps.onDayPress !== nextProps.onDayPress) {
    return false;
  }
  
  if (prevProps.currentDate !== nextProps.currentDate) {
    return false;
  }
  
  // Props identiques, pas de re-render
  return true;
});

OptimizedCalendar.displayName = 'OptimizedCalendar';

// Import Text manquant
import { Text } from 'react-native';