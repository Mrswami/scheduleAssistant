import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'dart:ui';
import '../providers/availability_provider.dart';
import '../models/availability_model.dart';
import '../widgets/w2w_grid_helper.dart';

class AvailabilityScreen extends ConsumerWidget {
  const AvailabilityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(availabilityProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0C0C0E),
      body: Stack(
        children: [
          // Background Gradient Orbs
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFDBB2D).withOpacity(0.05),
              ),
            ),
          ).animate().fadeIn(duration: 2.seconds).scale(begin: const Offset(0.8, 0.8)),
          
          Positioned(
            bottom: 100,
            left: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF22C55E).withOpacity(0.03),
              ),
            ),
          ).animate().fadeIn(duration: 3.seconds),

          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(24.0),
                  sliver: SliverToBoxAdapter(
                    child: _buildHeader(context),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => Padding(
                        padding: const EdgeInsets.only(bottom: 20.0),
                        child: _buildDayCard(preferences[index], index),
                      ),
                      itemCount: preferences.length,
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
          ),
          
          // Bottom Navigation / Action Bar (Floating)
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: _buildFloatingActionMenu(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.hive_outlined, color: Color(0xFFFDBB2D), size: 16),
                const SizedBox(width: 8),
                Text(
                  'MISSION CONTROL',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: const Color(0xFFFDBB2D).withOpacity(0.8),
                    letterSpacing: 3,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            _buildStatusBadge(),
          ],
        ).animate().fadeIn(duration: 800.ms).slideX(begin: -0.1),
        const SizedBox(height: 16),
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white),
            children: [
              const TextSpan(text: 'Your '),
              TextSpan(
                text: 'Schedule',
                style: TextStyle(color: const Color(0xFFFDBB2D).withOpacity(0.9)),
              ),
            ],
          ),
        ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2),
        const SizedBox(height: 8),
        Text(
          'Synchronization active through WhenToWork Bridge.',
          style: TextStyle(
            color: Colors.white.withOpacity(0.4),
            fontSize: 15,
            height: 1.5,
          ),
        ).animate().fadeIn(delay: 400.ms),
      ],
    );
  }

  Widget _buildStatusBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF22C55E).withOpacity(0.1),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFF22C55E).withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF22C55E).withOpacity(0.05),
            blurRadius: 10,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: Color(0xFF22C55E),
              shape: BoxShape.circle,
            ),
          ).animate(onPlay: (controller) => controller.repeat())
           .scale(begin: const Offset(1, 1), end: const Offset(1.5, 1.5), duration: 1.seconds)
           .fadeOut(),
          const SizedBox(width: 8),
          const Text(
            'ACTIVE',
            style: TextStyle(
              color: Color(0xFF22C55E),
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayCard(DayPreference preference, int index) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withOpacity(0.05),
                  Colors.white.withOpacity(0.02),
                ],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          preference.dayName.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          preference.isClosed ? 'Available All Day' : '${preference.blocks.length} SCHEDULED BLOCKS',
                          style: TextStyle(
                            color: preference.isClosed ? const Color(0xFF22C55E).withOpacity(0.6) : Colors.white.withOpacity(0.3),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                      ],
                    ),
                    _buildDayActionIcon(preference),
                  ],
                ),
                if (!preference.isClosed) ...[
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: preference.blocks.map((block) => _buildShiftPill(block)).toList(),
                  ),
                  const SizedBox(height: 24),
                  W2WGridHelper(preference: preference),
                ],
              ],
            ),
          ),
        ),
      ).animate(delay: (100 * index).ms).fadeIn().slideY(begin: 0.1),
    );
  }

  Widget _buildDayActionIcon(DayPreference preference) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: preference.isClosed ? const Color(0xFF22C55E).withOpacity(0.1) : Colors.white.withOpacity(0.05),
        shape: BoxShape.circle,
      ),
      child: Icon(
        preference.isClosed ? Icons.check_circle_outline : Icons.calendar_today_outlined,
        color: preference.isClosed ? const Color(0xFF22C55E) : Colors.white.withOpacity(0.5),
        size: 18,
      ),
    );
  }

  Widget _buildShiftPill(TimeBlock block) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFFFDBB2D).withOpacity(0.15),
            const Color(0xFFFDBB2D).withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFDBB2D).withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.access_time_filled, color: Color(0xFFFDBB2D), size: 10),
          const SizedBox(width: 6),
          Text(
            block.formattedRange,
            style: const TextStyle(
              color: Color(0xFFFDBB2D),
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionMenu() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(32),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavIcon(FontAwesomeIcons.house, true),
              _buildNavIcon(FontAwesomeIcons.calendarCheck, false),
              _buildNavIcon(FontAwesomeIcons.arrowsRotate, false, isSpecial: true),
              _buildNavIcon(FontAwesomeIcons.comments, false),
              _buildNavIcon(FontAwesomeIcons.gear, false),
            ],
          ),
        ),
      ),
    ).animate().slideY(begin: 1, duration: 800.ms, curve: Curves.easeOutCubic);
  }

  Widget _buildNavIcon(IconData icon, bool isActive, {bool isSpecial = false}) {
    return Container(
      width: 48,
      height: 48,
      decoration: isSpecial ? BoxDecoration(
        color: const Color(0xFFFDBB2D),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFDBB2D).withOpacity(0.3),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ],
      ) : null,
      child: Center(
        child: FaIcon(
          icon,
          color: isSpecial 
            ? Colors.black 
            : (isActive ? const Color(0xFFFDBB2D) : Colors.white.withOpacity(0.3)),
          size: 20,
        ),
      ),
    );
  }
}
