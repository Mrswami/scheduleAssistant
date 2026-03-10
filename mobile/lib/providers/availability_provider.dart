import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/availability_model.dart';

final availabilityProvider = StateProvider<List<DayPreference>>((ref) {
  return [
    const DayPreference(
      dayName: 'Monday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 15, minute: 15), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
    const DayPreference(
      dayName: 'Tuesday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 15, minute: 15), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
    const DayPreference(
      dayName: 'Wednesday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 15, minute: 15), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
    const DayPreference(
      dayName: 'Thursday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 15, minute: 15), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
    const DayPreference(
      dayName: 'Friday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 16, minute: 45), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
    const DayPreference(
      dayName: 'Saturday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 16, minute: 45), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
    const DayPreference(
      dayName: 'Sunday',
      blocks: [TimeBlock(startTime: TimeOfDay(hour: 17, minute: 45), endTime: TimeOfDay(hour: 22, minute: 15))],
    ),
  ];
});
