import 'package:flutter/material.dart';

class TimeBlock {
  final TimeOfDay startTime;
  final TimeOfDay endTime;

  const TimeBlock({required this.startTime, required this.endTime});

  String get formattedRange {
    return '${_formatTime(startTime)} - ${_formatTime(endTime)}';
  }

  String _formatTime(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute $period';
  }
}

class DayPreference {
  final String dayName;
  final List<TimeBlock> blocks;
  final bool isClosed;

  const DayPreference({
    required this.dayName,
    required this.blocks,
    this.isClosed = false,
  });
}
