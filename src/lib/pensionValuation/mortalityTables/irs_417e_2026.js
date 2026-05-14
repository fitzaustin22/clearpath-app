/**
 * IRS §417(e) 2026 Unisex Applicable Mortality Table — survival probabilities p_x.
 *
 * Source: IRS Notice 2025-40, "Updated Static Mortality Tables for Defined Benefit
 * Pension Plans for 2026," Appendix — column labeled "Unisex." Published in Internal
 * Revenue Bulletin 2025-31 (July 28, 2025). Derived per Rev. Rul. 2007-67 (50/50 blend
 * of male/female static combined rates under §1.430(h)(3)-1). Values are p_x = 1 − q_x.
 * p_119 forced to 0 (terminal age per spec §7.4.6 [R5a-5]).
 *
 * Indexed by age 0–119. `IRS_417E_2026_UNISEX[age]` = probability of surviving from
 * age `age` to age+1.
 */
export const IRS_417E_2026_UNISEX = Object.freeze([
  0.99674, // age 0
  0.99977, // age 1
  0.99985, // age 2
  0.99989, // age 3
  0.99991, // age 4
  0.99992, // age 5
  0.99993, // age 6
  0.99993, // age 7
  0.99994, // age 8
  0.99995, // age 9
  0.99995, // age 10
  0.99995, // age 11
  0.99993, // age 12
  0.99991, // age 13
  0.99989, // age 14
  0.99987, // age 15
  0.99985, // age 16
  0.99983, // age 17
  0.99980, // age 18
  0.99978, // age 19
  0.99977, // age 20
  0.99977, // age 21
  0.99976, // age 22
  0.99975, // age 23
  0.99974, // age 24
  0.99973, // age 25
  0.99973, // age 26
  0.99971, // age 27
  0.99970, // age 28
  0.99969, // age 29
  0.99967, // age 30
  0.99965, // age 31
  0.99964, // age 32
  0.99960, // age 33
  0.99959, // age 34
  0.99956, // age 35
  0.99954, // age 36
  0.99951, // age 37
  0.99949, // age 38
  0.99947, // age 39
  0.99945, // age 40
  0.99944, // age 41
  0.99942, // age 42
  0.99940, // age 43
  0.99937, // age 44
  0.99935, // age 45
  0.99931, // age 46
  0.99927, // age 47
  0.99923, // age 48
  0.99917, // age 49
  0.99910, // age 50
  0.99900, // age 51
  0.99888, // age 52
  0.99875, // age 53
  0.99858, // age 54
  0.99830, // age 55
  0.99792, // age 56
  0.99758, // age 57
  0.99719, // age 58
  0.99678, // age 59
  0.99627, // age 60
  0.99573, // age 61
  0.99496, // age 62
  0.99418, // age 63
  0.99355, // age 64
  0.99271, // age 65
  0.99181, // age 66
  0.99094, // age 67
  0.98999, // age 68
  0.98892, // age 69
  0.98768, // age 70
  0.98626, // age 71
  0.98465, // age 72
  0.98283, // age 73
  0.98072, // age 74
  0.97830, // age 75
  0.97553, // age 76
  0.97239, // age 77
  0.96880, // age 78
  0.96472, // age 79
  0.95985, // age 80
  0.95488, // age 81
  0.94930, // age 82
  0.94303, // age 83
  0.93593, // age 84
  0.92784, // age 85
  0.91861, // age 86
  0.90818, // age 87
  0.89637, // age 88
  0.88328, // age 89
  0.86888, // age 90
  0.85383, // age 91
  0.83830, // age 92
  0.82233, // age 93
  0.80617, // age 94
  0.78985, // age 95
  0.77251, // age 96
  0.75471, // age 97
  0.73637, // age 98
  0.71748, // age 99
  0.69822, // age 100
  0.67875, // age 101
  0.65940, // age 102
  0.64023, // age 103
  0.62128, // age 104
  0.60285, // age 105
  0.58488, // age 106
  0.56760, // age 107
  0.55105, // age 108
  0.53521, // age 109
  0.52255, // age 110
  0.51429, // age 111
  0.50648, // age 112
  0.50276, // age 113
  0.50160, // age 114
  0.50047, // age 115
  0.50025, // age 116
  0.50012, // age 117
  0.50005, // age 118
  0.00000, // age 119
]);
