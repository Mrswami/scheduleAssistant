import 'package:flutter/material.dart';
import '../models/availability_model.dart';

class W2WGridHelper extends StatelessWidget {
  final DayPreference preference;

  const W2WGridHelper({super.key, required this.preference});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'W2W TRANSLATION GUIDE',
          style: TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: List.generate(24, (index) {
            final isPreferred = _isTimePreferred(index);
            return Expanded(
              child: Container(
                height: 24,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  color: isPreferred ? Colors.green.withOpacity(0.4) : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: BorderSide(
                    color: isPreferred ? Colors.green.withOpacity(0.6) : Colors.white.withOpacity(0.05),
                    width: 0.5,
                  ),
                ),
                child: index % 4 == 0
                    ? Center(
                        child: Text(
                          '${index == 0 ? 12 : (index > 12 ? index - 12 : index)}',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.3),
                            fontSize: 8,
                          ),
                        ),
                      )
                    : null,
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildLegendItem('Preferred', Colors.green),
            _buildLegendItem('Cannot Work', Colors.red),
            Text(
              'Click green zones in W2W',
              style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 9, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      ],
    );
  }

  bool _isTimePreferred(int hour) {
    if (preference.isClosed) return false;
    for (var block in preference.blocks) {
      if (hour >= block.startTime.hour && hour < block.endTime.hour) {
        return true;
      }
    }
    return false;
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color.withOpacity(0.4),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 9),
        ),
      ],
    );
  }
}
