import 'package:flutter/material.dart';
import '../models/availability_model.dart';
import 'package:google_fonts/google_fonts.dart';

class W2WGridHelper extends StatelessWidget {
  final DayPreference preference;

  const W2WGridHelper({super.key, required this.preference});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'W2W TRANSLATION GUIDE',
              style: GoogleFonts.outfit(
                color: Colors.white.withOpacity(0.4),
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 2.5,
              ),
            ),
            const Icon(Icons.info_outline, color: Colors.white24, size: 12),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.02),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Row(
              children: List.generate(24, (index) {
                final isPreferred = _isTimePreferred(index);
                return Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: isPreferred 
                        ? const Color(0xFF22C55E).withOpacity(0.2) 
                        : Colors.transparent,
                      border: Border(
                        right: BorderSide(
                          color: index == 23 ? Colors.transparent : Colors.white.withOpacity(0.05),
                          width: 0.5,
                        ),
                      ),
                    ),
                    child: index % 6 == 0
                        ? Center(
                            child: Text(
                              '${index == 0 ? 12 : (index > 12 ? index - 12 : index)}',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.2),
                                fontSize: 7,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        : null,
                  ),
                );
              }),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildLegendItem('Preferred Zone', const Color(0xFF22C55E).withOpacity(0.4)),
            const SizedBox(width: 16),
            _buildLegendItem('Blocked', Colors.white.withOpacity(0.05)),
            const Spacer(),
            Text(
              'Click green in W2W',
              style: TextStyle(
                color: Colors.white.withOpacity(0.2),
                fontSize: 9,
                fontWeight: FontWeight.w500,
                fontStyle: FontStyle.italic,
              ),
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
            color: color,
            borderRadius: BorderRadius.circular(3),
            boxShadow: color.opacity > 0.1 ? [
              BoxShadow(
                color: color.withOpacity(0.1),
                blurRadius: 4,
                spreadRadius: 1,
              ),
            ] : null,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.4),
            fontSize: 9,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
