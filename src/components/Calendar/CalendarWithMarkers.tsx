import React from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors } from '../../theme/colors';
import { CalendarMarkers } from '../../hooks/useCalendarData';

interface CalendarWithMarkersProps {
  markers: CalendarMarkers;
  onDayPress?: (day: DateData) => void;
  selectedDate?: string;
  theme?: 'light' | 'dark';
}

export const CalendarWithMarkers: React.FC<CalendarWithMarkersProps> = ({
  markers,
  onDayPress,
  selectedDate,
  theme = 'light'
}) => {
  // Ajouter la sélection au marqueur existant
  const combinedMarkers = { ...markers };
  
  if (selectedDate && onDayPress) {
    combinedMarkers[selectedDate] = {
      ...combinedMarkers[selectedDate],
      selected: true,
      selectedColor: Colors.secondary,
      customStyles: {
        ...combinedMarkers[selectedDate]?.customStyles,
        container: {
          ...combinedMarkers[selectedDate]?.customStyles?.container,
          backgroundColor: Colors.secondary,
          borderColor: Colors.secondaryLight,
          borderWidth: 2,
        } as any,
        text: {
          ...combinedMarkers[selectedDate]?.customStyles?.text,
          color: Colors.primary,
        } as any,
      },
    };
  }

  return (
    <Calendar
      markedDates={combinedMarkers}
      onDayPress={onDayPress}
      theme={{
        backgroundColor: theme === 'light' ? Colors.background : Colors.primaryDark,
        calendarBackground: theme === 'light' ? Colors.background : Colors.primaryDark,
        textSectionTitleColor: Colors.textSecondary,
        selectedDayBackgroundColor: Colors.secondary,
        selectedDayTextColor: Colors.primary,
        todayTextColor: Colors.secondary,
        dayTextColor: Colors.textPrimary,
        textDisabledColor: Colors.textMuted,
        dotColor: Colors.secondary,
        selectedDotColor: Colors.primary,
        arrowColor: Colors.primary,
        disabledArrowColor: Colors.textMuted,
        monthTextColor: Colors.textPrimary,
        indicatorColor: Colors.secondary,
        textDayFontFamily: 'System',
        textMonthFontFamily: 'System',
        textDayHeaderFontFamily: 'System',
        textDayFontWeight: '400',
        textMonthFontWeight: '700',
        textDayHeaderFontWeight: '600',
        textDayFontSize: 16,
        textMonthFontSize: 18,
        textDayHeaderFontSize: 14,
      }}
      markingType="custom"
      hideArrows={false}
      hideExtraDays={false}
      disableMonthChange={false}
      firstDay={1} // Lundi en premier
      hideDayNames={false}
      showWeekNumbers={false}
      disableArrowLeft={false}
      disableArrowRight={false}
      enableSwipeMonths={true}
    />
  );
};