/**
 * SOA Pub-2010 Unisex Blend — survival probabilities p_x.
 *
 * Source: Society of Actuaries, "Pub-2010 Public Retirement Plans Mortality Tables
 * Report," January 2019. Excel file: "Pub-2010 Amount-Weighted Mortality Rates"
 * (pub-2010-amount-mort-rates.xlsx). Sheet: PubG-2010 (General, total dataset).
 * Juvenile rates from the Juvenile sheet (ages 0–17). Construction: ages 0–17 juvenile
 * q_x, ages 18–49 Employee q_x, ages 50+ Healthy Retiree q_x. Unisex blend:
 * p_x = 1 − (q_x_male + q_x_female) / 2. p_119 forced to 0 (terminal age per §7.4.6 [R5a-5]).
 *
 * Indexed by age 0–119. `PUB_2010_UNISEX[age]` = probability of surviving from
 * age `age` to age+1.
 */
export const PUB_2010_UNISEX = Object.freeze([
  0.99974, // age 0
  0.99985, // age 1
  0.99989, // age 2
  0.99991, // age 3
  0.99991, // age 4
  0.99991, // age 5
  0.99991, // age 6
  0.99991, // age 7
  0.99992, // age 8
  0.99992, // age 9
  0.99991, // age 10
  0.99991, // age 11
  0.99991, // age 12
  0.99991, // age 13
  0.99989, // age 14
  0.99987, // age 15
  0.99983, // age 16
  0.99979, // age 17
  0.99975, // age 18
  0.99974, // age 19
  0.99975, // age 20
  0.99976, // age 21
  0.99978, // age 22
  0.99979, // age 23
  0.99981, // age 24
  0.99982, // age 25
  0.99980, // age 26
  0.99979, // age 27
  0.99977, // age 28
  0.99977, // age 29
  0.99974, // age 30
  0.99973, // age 31
  0.99971, // age 32
  0.99970, // age 33
  0.99967, // age 34
  0.99965, // age 35
  0.99962, // age 36
  0.99960, // age 37
  0.99957, // age 38
  0.99953, // age 39
  0.99949, // age 40
  0.99945, // age 41
  0.99940, // age 42
  0.99935, // age 43
  0.99930, // age 44
  0.99923, // age 45
  0.99916, // age 46
  0.99909, // age 47
  0.99901, // age 48
  0.99892, // age 49
  0.99740, // age 50
  0.99723, // age 51
  0.99704, // age 52
  0.99684, // age 53
  0.99664, // age 54
  0.99642, // age 55
  0.99618, // age 56
  0.99592, // age 57
  0.99565, // age 58
  0.99535, // age 59
  0.99501, // age 60
  0.99462, // age 61
  0.99416, // age 62
  0.99365, // age 63
  0.99306, // age 64
  0.99237, // age 65
  0.99157, // age 66
  0.99066, // age 67
  0.98961, // age 68
  0.98841, // age 69
  0.98706, // age 70
  0.98553, // age 71
  0.98381, // age 72
  0.98187, // age 73
  0.97969, // age 74
  0.97723, // age 75
  0.97447, // age 76
  0.97135, // age 77
  0.96784, // age 78
  0.96386, // age 79
  0.95933, // age 80
  0.95420, // age 81
  0.94836, // age 82
  0.94178, // age 83
  0.93435, // age 84
  0.92602, // age 85
  0.91672, // age 86
  0.90640, // age 87
  0.89504, // age 88
  0.88262, // age 89
  0.86921, // age 90
  0.85498, // age 91
  0.84008, // age 92
  0.82453, // age 93
  0.80832, // age 94
  0.79143, // age 95
  0.77382, // age 96
  0.75544, // age 97
  0.73632, // age 98
  0.71650, // age 99
  0.69615, // age 100
  0.67549, // age 101
  0.65489, // age 102
  0.63451, // age 103
  0.61454, // age 104
  0.59512, // age 105
  0.57639, // age 106
  0.55848, // age 107
  0.54147, // age 108
  0.52545, // age 109
  0.51155, // age 110
  0.50398, // age 111
  0.50000, // age 112
  0.50000, // age 113
  0.50000, // age 114
  0.50000, // age 115
  0.50000, // age 116
  0.50000, // age 117
  0.50000, // age 118
  0.00000, // age 119
]);
