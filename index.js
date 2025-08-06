/*
 * A javascript template to decode SOCOMEC B10-L "like" standard payload 
 *
 */


// ----------------------------------------------------------------
//                         CONST
// ----------------------------------------------------------------
const INT32_MAX = 2 ** 31;
const INT32_MIN = (-2) ** 31;
const INT16_MAX = 2 ** 15;
const INT16_MIN = (-2) ** 15;
const ACCEPTED_PROFILES = [
    {
        "profile_id": 0,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    },
    {
        "profile_id": 1,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    },
    {
        "profile_id": 2,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    },
    {
        "profile_id": 3,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    },
    {
        "profile_id": 4,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    },
    {
        "profile_id": 5,
        "versions" : [{"profile_version" : 1, "length" : 44}]
    },
    {
        "profile_id": 6,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    },
    {
        "profile_id": 7,
        "versions" : [{"profile_version" : 1, "length" : 50}]
    }
];

// ----------------------------------------------------------------
//                         FUNCTIONS PART 
// ----------------------------------------------------------------

function byteArrayToHexString(byteArray) {
    let hexString = '';
    for (let i = 0; i < byteArray.length; i++) {
        const hex = (byteArray[i] & 0xFF).toString(16);
        hexString += hex.length === 1 ? '0' + hex : hex; // Ajoute un zéro devant si nécessaire
    }
    return hexString;
}

function isHexString(byteArray) {
    // Vérifie que chaque élément du tableau est un nombre entre 0 et 255
    const isValidByte = byteArray.every(byte => byte >= 0 && byte <= 255);

    // Vérifie que la longueur du tableau est paire (chaque octet est représenté par deux caractères hexadécimaux)
    //const isEvenLength = byteArray.length % 2 === 0;

	// Convertit le tableau d'octets en une chaîne hexadécimale
    const hexString = byteArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    // Vérifie que la chaîne est composée uniquement de caractères hexadécimaux
    const isValidHex = /^[0-9A-Fa-f]+$/.test(hexString);

    return isValidByte && isValidHex;
}

function U32toS32(number) {
    if (number > INT32_MAX) {
        // Le nombre est positif et dépasse la limite positive de 2^31.
        // Soustrayons 2^32 pour obtenir la valeur signée équivalente.
        number -= 2 ** 32;
    } else if (number < INT32_MIN) {
        // Le nombre est négatif et inférieur à la limite négative de 2^31.
        // Ajoutons 2^32 pour obtenir la valeur signée équivalente.
        number += 2 ** 32;
    }

    return number;
}
//function U32toS32 (number){
//	if (number > 2**31) number -= 2**32;
//	return number;
//}

function U32toS16(number) {
    if (number > INT16_MAX) {
        // Le nombre est positif et dépasse la limite positive de 2^15.
        // Soustrayons 2^16 pour obtenir la valeur signée équivalente.
        number -= 2 ** 16;
    } else if (number < INT16_MIN) {
        // Le nombre est négatif et inférieur à la limite négative de 2^15.
        // Ajoutons 2^16 pour obtenir la valeur signée équivalente.
        number += 2 ** 16;
    }

    return number;
}
//function U32toS16 (number){
//	if (number > 2**15) number -= 2**16;
//	return number;
//}

function readBytes(bytes, from, count) {
    let result = 0;
    for (let i = 0; i < count; i++) {
        // Multiplie la valeur de l'octet par 256^(count - 1 - i)
        result += bytes[from + i] * (256 ** (count - 1 - i));
    }
    return result;
}
//function readBytes (bytes, from, count) {
//    var result = 0;
//    for (var i = 0; i < count; i++){
//        result += bytes[from + i] * (256**(count - 1 - i));
//    }
//    return result;
//}

function is_default_u32(value){
    return value == 2**32 - 1
}
function is_default_s32(value){
    return value == 2**31 - 1
}
function is_default_u16(value){
    return value == 2**16 - 1
}
function is_default_s16(value){
    return value == 2**15 - 1
}

// ----------------------------------------------------------------
//                         MAIN 
// ----------------------------------------------------------------

//export function decodeUplink(input){
function decodeUplink(input){
	// initiate output object
    var output = {
		codec: {
			codecName: "SOCOMEC JS B-10L codec",
			codecVersion: "v1.1",
			codecDate: "2024-03-07"
		},
		executionTime: (new Date()).toISOString(),
		input: {
			bytes: byteArrayToHexString(input.bytes),
			fPort: input.fPort,
			recvTime: input.recvTime
		},
        data: {
			frame:{}
		},
        warnings: [],
		errors: []
    }

	// check input content
	if (! isHexString(input.bytes)) {
		output.errors.push("Frame should be an hexadecimal string");
		return output;
	}

	// check fPort: 0 is void, all uplinks arrive on port 2
	if (input.fPort==0) {
		output.warnings.push("Void message, no data");
		return output;
	}
	else if (input.fPort!=2){
		output.errors.push(`No frame shoud be sent on port ${input.fPort}`);
		return output;
	}

	let index;
	let MsgType;
	if (input.bytes.length >= 1) {
		MsgType = input.bytes[0]; // Type of message
	}
	else {
		output.errors.push(`Frame is too short (${input.bytes.length} bytes)`);
		return output;
	}
		
	// Handling different message types
	// --------------------------------
	let NbSecond = 0;
	//Alarms
	if (MsgType == 0x11) {
		index = 5;
		NbSecond = readBytes(input.bytes, 1, 4);
		let LogicCombi_Alarm = input.bytes[index++];
		let Analogic_Alarm = input.bytes[index++];
		let System_Alarm = input.bytes[index++];
		let Protection_Alarm = input.bytes[index++];

		output.data.frame.frame_type = MsgType;
		output.data.frame.frame_type_label = "Alarm";

		if (NbSecond === 0 ) {
			output.errors.push("Datetime t0 is not set correctly");
			output.data.timestamp = null;
		}
		else
			output.data.timestamp = new Date( (NbSecond*1000) + Date.UTC(2000,0,1,0,0,0) );

		output.data = {
			...output.data,
			ILogicalAlarmValue1: (LogicCombi_Alarm & 0x01) ? 1 : 0,
			ILogicalAlarmValue2: (LogicCombi_Alarm & 0x02) ? 1 : 0,
			ILogicalAlarmValue3: (LogicCombi_Alarm & 0x04) ? 1 : 0,
			ILogicalAlarmValue4: (LogicCombi_Alarm & 0x08) ? 1 : 0,
			ICombiAlarmValue1: (LogicCombi_Alarm & 0x10) ? 1 : 0,
			ICombiAlarmValue2: (LogicCombi_Alarm & 0x20) ? 1 : 0,
			ICombiAlarmValue3: (LogicCombi_Alarm & 0x40) ? 1 : 0,
			ICombiAlarmValue4: (LogicCombi_Alarm & 0x80) ? 1 : 0,

			IAnalogAlarmValue1: (Analogic_Alarm & 0x01) ? 1 : 0,
			IAnalogAlarmValue2: (Analogic_Alarm & 0x02) ? 1 : 0,
			IAnalogAlarmValue3: (Analogic_Alarm & 0x04) ? 1 : 0,
			IAnalogAlarmValue4: (Analogic_Alarm & 0x08) ? 1 : 0,
			IAnalogAlarmValue5: (Analogic_Alarm & 0x10) ? 1 : 0,
			IAnalogAlarmValue6: (Analogic_Alarm & 0x20) ? 1 : 0,
			IAnalogAlarmValue7: (Analogic_Alarm & 0x40) ? 1 : 0,
			IAnalogAlarmValue8: (Analogic_Alarm & 0x80) ? 1 : 0,

			ISystemAlarmValue1: (System_Alarm & 0x01) ? 1 : 0,
			ISystemAlarmValue2: (System_Alarm & 0x02) ? 1 : 0,
			ISystemAlarmValue3: (System_Alarm & 0x04) ? 1 : 0,
			ISystemAlarmValue4: (System_Alarm & 0x08) ? 1 : 0,
			
			IProtectionAlarmValue1: (Protection_Alarm & 0x01) ? 1 : 0,
			IProtectionAlarmValue2: (Protection_Alarm & 0x02) ? 1 : 0,
			IProtectionAlarmValue3: (Protection_Alarm & 0x04) ? 1 : 0,
			IProtectionAlarmValue4: (Protection_Alarm & 0x08) ? 1 : 0,
			IProtectionAlarmValue5: (Protection_Alarm & 0x10) ? 1 : 0,
			IProtectionAlarmValue6: (Protection_Alarm & 0x20) ? 1 : 0,
		};
	}

	//periodic data
	if (MsgType == 2) {
		let Profile;
		let Profile_version;
		if(input.bytes.length>=2) {
			Profile = ((input.bytes[1] & 0xF0) >>> 4);
			Profile_version = (input.bytes[1] & 0x0F);
		}
		else {
			output.errors.push('Data periodic frame should be larger than 1 byte');
			return output;
		}

		// Cherche le profil avec l'ID calculé
		const frameProfile = ACCEPTED_PROFILES.find(profile => profile.profile_id === Profile);
		if (! frameProfile) {
			output.errors.push(`Periodic data profile ${Profile} is not managed`);
			return output;
		}

		const frameVersion = frameProfile.versions.find(version => version.profile_version === Profile_version);
		if (! frameVersion) {
			output.errors.push(`Version ${Profile_version} of periodic data profile ${Profile} is not managed`);
			return output;
		}

		if (input.bytes.length != frameVersion.length) {
            output.errors.push(`Frame in version ${Profile_version} of periodic data profile ${Profile} should be ${frameVersion.length} bytes long`);
			return output;
		}

		let Decode_DIaVM = false;
		let Decode_CounterStatus = false;
		let DIaVM;
		let CounterStatus;

		output.data.frame.frame_type = MsgType;
		output.data.frame.frame_type_label = "Periodical data";
		output.data.frame.profileId = Profile;
		output.data.frame.profileVersion = Profile_version;

		if  (Profile === 0)
			output.warnings.push('Profile 0 (custom) can not be decoded');

		if (Profile === 1) // Single-load – Energies (consumption/production)
		{
			output.data.frame.profileLabel =  "1 - Single Load energies (consumption/production)";

			NbSecond = readBytes(input.bytes, 2 , 4);
			var Ea_plus = readBytes(input.bytes, 6, 8);
			var Ea_moins = readBytes(input.bytes, 14, 8);
			var Er_plus = readBytes(input.bytes, 22, 8);
			var Er_moins = readBytes(input.bytes, 30, 8);
			var PulseMeter = readBytes(input.bytes, 38, 8);

			DIaVM = readBytes(input.bytes, 46, 2);
			Decode_DIaVM = true;
			CounterStatus = readBytes(input.bytes, 48, 2);
			Decode_CounterStatus = true;
						
			output.data = {
				...output.data,
				
				IEaPInst: Ea_plus/10000,
				IEaPInst_Unit: "kWh",
				IEaNInst: Ea_moins/10000,
				IEaNInst_Unit: "kWh",
				IErPInst: Er_plus/10000,
				IErPInst_Unit: "kVar",
				IErNInst: Er_moins/10000,
				IErNInst_Unit: "kVar",
				ITotalMeter: PulseMeter/10000,
				ITotalMeter_Unit: "pulse"
			};
		}

		if (Profile === 2) //Profile 2: Multi-load – Energies (consumption)
		{
			output.data.frame.profileLabel = "2- Multi-load - Energies (consumption)";

			NbSecond = readBytes(input.bytes, 2 , 4);
			let Ea_plus_Load1 = readBytes(input.bytes, 6, 4);
			let Er_plus_Load1 = readBytes(input.bytes, 10, 4);
			let Ea_plus_Load2 = readBytes(input.bytes, 14, 4);
			let Er_plus_Load2 = readBytes(input.bytes, 18, 4);
			let Ea_plus_Load3 = readBytes(input.bytes, 22, 4);
			let Er_plus_Load3 = readBytes(input.bytes, 16, 4);
			let Ea_plus_Load4 = readBytes(input.bytes, 30, 4);
			let Er_plus_Load4 = readBytes(input.bytes, 34, 4);
			let PulseMeter = readBytes(input.bytes, 38, 8);

			DIaVM = readBytes(input.bytes, 46, 2);
			Decode_DIaVM = true;
			CounterStatus = readBytes(input.bytes, 48, 2);
			Decode_CounterStatus = true;
						
			output.data = {
				...output.data,
				
				IEaPInst1: Ea_plus_Load1,
				IEaPInst1_Unit: "kWh",
				IErPInst1: Er_plus_Load1,
				IErPInst1_Unit: "kVar",
				
				IEaPInst2: Ea_plus_Load2,
				IEaPInst2_Unit: "kWh",
				IErPInst2: Er_plus_Load2,
				IErPInst2_Unit: "kVar",

				IEaPInst3: Ea_plus_Load3,
				IEaPInst3_Unit: "kWh",
				IErPInst3: Er_plus_Load3,
				IErPInst3_Unit: "kVar",

				IEaPInst4: Ea_plus_Load4,
				IEaPInst4_Unit: "kWh",
				IErPInst4: Er_plus_Load4,
				IErPInst4_Unit: "kVar",
			};
		}

		if (Profile === 3) //Profile 3: Multi-load – Energies (consumption/production)
		{
			output.data.frame.profileLabel = "3- Multi-load - energies (consumption/production)";

			NbSecond = readBytes(input.bytes, 2 , 4);
			let Ea_plus_Load1 = readBytes(input.bytes, 6, 4);
			let Ea_moins_Load1 = readBytes(input.bytes, 10, 4);
			let Ea_plus_Load2 = readBytes(input.bytes, 14, 4);
			let Ea_moins_Load2 = readBytes(input.bytes, 18, 4);
			let Ea_plus_Load3 = readBytes(input.bytes, 22, 4);
			let Ea_moins_Load3 = readBytes(input.bytes, 16, 4);
			let Ea_plus_Load4 = readBytes(input.bytes, 30, 4);
			let Ea_moins_Load4 = readBytes(input.bytes, 34, 4);
			let PulseMeter = readBytes(input.bytes, 38, 8);

			DIaVM = readBytes(input.bytes, 46, 2);
			Decode_DIaVM = true;
			CounterStatus = readBytes(input.bytes, 48, 2);
			Decode_CounterStatus = true;
		
			output.data = {
				...output.data,
				
				IEaPInst1: Ea_plus_Load1,
				IEaPInst1_Unit: "kWh",
				IEaNInst1: Ea_moins_Load1,
				IEaNInst1_Unit: "kWh",
				
				IEaPInst2: Ea_plus_Load2,
				IEaPInst2_Unit: "kWh",
				IEaNInst2: Ea_moins_Load2,
				IEaNInst2_Unit: "kWh",

				IEaPInst3: Ea_plus_Load3,
				IEaPInst3_Unit: "kWh",
				IEaNInst3: Ea_moins_Load3,
				IEaNInst3_Unit: "kWh",

				IEaPInst4: Ea_plus_Load4,
				IEaPInst4_Unit: "kWh",
				IEaNInst4: Ea_moins_Load4,
				IEaNInst4_Unit: "kWh",
			};
		}

		if (Profile === 4) //Profile 4: Single-load – Monitoring
		{
			output.data.frame.profileLabel = "4- Single-load - Monitoring";

			NbSecond = readBytes(input.bytes, 2 , 4);
			let Pmoy = is_default_s32(readBytes(input.bytes, 6, 4)) ? null : U32toS32(readBytes(input.bytes, 6, 4))/1000;
			let Qmoy = is_default_s32(readBytes(input.bytes, 10, 4)) ? null : U32toS32(readBytes(input.bytes, 10, 4))/1000;
			let Smoy = is_default_u32(readBytes(input.bytes, 14, 4)) ? null : (readBytes(input.bytes, 14, 4))/1000;
			let Pf_Moy = is_default_s16(readBytes(input.bytes, 18, 2)) ? null : U32toS16(readBytes(input.bytes, 18, 2));
			let Pf_Type = (readBytes(input.bytes, 20, 2));
			let I1_Moy = is_default_u32(readBytes(input.bytes, 22, 4)) ? null : (readBytes(input.bytes, 22, 4))/1000;
			let I2_Moy = is_default_u32(readBytes(input.bytes, 26, 4)) ? null : (readBytes(input.bytes, 26, 4))/1000;
			let I3_Moy = is_default_u32(readBytes(input.bytes, 30, 4)) ? null : (readBytes(input.bytes, 30, 4))/1000;
			let F_moy = is_default_u32(readBytes(input.bytes, 34, 4)) ? null : (readBytes(input.bytes, 34, 4))/1000;
			DIaVM = readBytes(input.bytes, 38, 2);
			Decode_DIaVM = true;
			let Temp_1 = is_default_s16(readBytes(input.bytes, 40, 2)) ? null : U32toS16(readBytes(input.bytes, 40, 2))/100;
			let Temp_2 = is_default_s16(readBytes(input.bytes, 42, 2)) ? null : U32toS16(readBytes(input.bytes, 42, 2))/100;
			let Temp_3 = is_default_s16(readBytes(input.bytes, 44, 2)) ? null : U32toS16(readBytes(input.bytes, 44, 2))/100;
			let CounterStatus2 = (readBytes(input.bytes, 46, 2)); 
			CounterStatus = readBytes(input.bytes, 48, 2);
			Decode_CounterStatus = true;

			output.data = {
				...output.data,
				
				IPSumAvgInst: Pmoy,
				IPSumAvgInst_Unit: "kW",
				IQSumAvgInst: Qmoy,
				IQSumAvgInst_Unit: "kVar",
				ISSumAvgInst: Smoy,
				ISSumAvgInst_Unit: "kVar",

				IpFSumAvgInst: Pf_Moy,
				IpFSumAvgInst_Unit: null,
				IpFSumTypeAvg: Pf_Type,
				IpFSumTypeAvg_Unit: null,

				II1AvgInst: I1_Moy,
				II1AvgInst_Unit: "A",
				II2AvgInst: I2_Moy,
				II2AvgInst_Unit: "A",
				II3AvgInst: I3_Moy,
				II3AvgInst_Unit: "A",

				IFreqAvgInst: F_moy,
				IFreqAvgInst_Unit: "Hz",

				IInstTemperature1: Temp_1,
				IInstTemperature2: Temp_2,
				IInstTemperature3: Temp_3,
				
				IInstTemperature1_unit: "°C",
				IInstTemperature2_unit: "°C",
				IInstTemperature3_unit: "°C",

				CT1Cpt: (CounterStatus2 & 0x000F),
				CT2Cpt: ((CounterStatus2 & 0x00F0) >> 4),
				CT3Cpt: ((CounterStatus2 & 0x0F00) >> 8),
				CT4Cpt: ((CounterStatus2 & 0xF000) >> 12)
			};
		}

		if (Profile === 5) //Profile 5- Multi-load – Monitoring
		{
			output.data.frame.profileLabel = "5- Multi-load - Monitoring";

			NbSecond = readBytes(input.bytes, 2 , 4);
			let Pmoy_Load1 = is_default_s32(readBytes(input.bytes, 6, 4)) ? null : U32toS32(readBytes(input.bytes, 6, 4))/1000;
			let Qmoy_Load1 = is_default_s32(readBytes(input.bytes, 10, 4)) ? null : U32toS32(readBytes(input.bytes, 10, 4))/1000;
			let Pmoy_Load2 = is_default_s32(readBytes(input.bytes, 14, 4)) ? null : U32toS32(readBytes(input.bytes, 14, 4))/1000;
			let Qmoy_Load2 = is_default_s32(readBytes(input.bytes, 18, 4)) ? null : U32toS32(readBytes(input.bytes, 18, 4))/1000;
			let Pmoy_Load3 = is_default_s32(readBytes(input.bytes, 22, 4)) ? null : U32toS32(readBytes(input.bytes, 22, 4))/1000;
			let Qmoy_Load3 = is_default_s32(readBytes(input.bytes, 26, 4)) ? null : U32toS32(readBytes(input.bytes, 26, 4))/1000;
			let Pmoy_Load4 = is_default_s32(readBytes(input.bytes, 30, 4)) ? null : U32toS32(readBytes(input.bytes, 30, 4))/1000;
			let Qmoy_Load4 = is_default_s32(readBytes(input.bytes, 34, 4)) ? null : U32toS32(readBytes(input.bytes, 34, 4))/1000;

			DIaVM = readBytes(input.bytes, 38, 2);
			Decode_DIaVM = true;
			CounterStatus = readBytes(input.bytes, 40, 2);
			Decode_CounterStatus = true;

			output.data = {
				...output.data,
				
				IPSumAvgInst1: Pmoy_Load1,
				IPSumAvgInst1_Unit: "kW",
				IQSumAvgInst1: Qmoy_Load1,
				IQSumAvgInst1_Unit: "kVar",

				IPSumAvgInst2: Pmoy_Load2,
				IPSumAvgInst2_Unit: "kW",
				IQSumAvgInst2: Qmoy_Load2,
				IQSumAvgInst2_Unit: "kVar",

				IPSumAvgInst3: Pmoy_Load3,
				IPSumAvgInst3_Unit: "kW",
				IQSumAvgInst3: Qmoy_Load3,
				IQSumAvgInst3_Unit: "kVar",

				IPSumAvgInst4: Pmoy_Load4,
				IPSumAvgInst4_Unit: "kW",
				IQSumAvgInst4: Qmoy_Load4,
				IQSumAvgInst4_Unit: "kVar",
			};
		}

		if (Profile === 6) //Profile 6- Single-load – Load curves
		{
			output.data.frame.profileLabel = "6- Single-load - Load curves";

			let Date_t0 = null;
			if (is_default_u32(readBytes(input.bytes, 2, 4)))
				output.warnings.push('t0 values are not available')
			else if (readBytes(input.bytes, 2, 4) < 20*165*24*60*60)
				output.warnings.push('Datetime t0 is not set correctly')
			else
				Date_t0 =new Date( (readBytes(input.bytes, 2, 4)*1000) + Date.UTC(2000,0,1,0,0,0) );
			let P_Plus_t0 = is_default_u32(readBytes(input.bytes, 6, 4)) ? null : (readBytes(input.bytes, 6, 4))/1000;
			let P_Moins_t0 = is_default_u32(readBytes(input.bytes, 10, 4)) ? null : (readBytes(input.bytes, 10, 4))/1000;
			let Q_Plus_t0 = is_default_u32(readBytes(input.bytes, 14, 4)) ? null : (readBytes(input.bytes, 14, 4))/1000;
			let Q_Moins_t0 = is_default_u32(readBytes(input.bytes, 18, 4)) ? null : (readBytes(input.bytes, 18, 4))/1000;
			let type_t0 = is_default_u16(readBytes(input.bytes, 22, 2)) ? null : readBytes(input.bytes, 22, 2);

			let Date_t1 = null;
			if (is_default_u32(readBytes(input.bytes, 24, 4)))
				output.warnings.push('t-1 values are not available')
			else if (readBytes(input.bytes, 24, 4) < 20*165*24*60*60)
				output.warnings.push('Datetime t-1 is not set correctly')
			else
				Date_t1 =new Date( (readBytes(input.bytes, 24, 4)*1000) + Date.UTC(2000,0,1,0,0,0) );
			let P_Plus_t1 = is_default_u32(readBytes(input.bytes, 28, 4)) ? null : (readBytes(input.bytes, 28, 4))/1000;
			let P_Moins_t1 = is_default_u32(readBytes(input.bytes, 32, 4)) ? null : (readBytes(input.bytes, 32, 4))/1000;
			let Q_Plus_t1 = is_default_u32(readBytes(input.bytes, 36, 4)) ? null : (readBytes(input.bytes, 36, 4))/1000;
			let Q_Moins_t1 = is_default_u32(readBytes(input.bytes, 40, 4)) ? null : (readBytes(input.bytes, 40, 4))/1000;
			let type_t1 = is_default_u16(readBytes(input.bytes, 44, 2)) ? null : readBytes(input.bytes, 44, 2);

			DIaVM = readBytes(input.bytes, 46, 2);
			Decode_DIaVM = true;
			CounterStatus = readBytes(input.bytes, 48, 2);
			Decode_CounterStatus = true;
		
			output.data = {
				...output.data,
				
				timestamp_t0: Date_t0,
				ILastP10ActivePower: P_Plus_t0,
				ILastP10ActivePower_Unit: "kW",
				ILastP10ActivePowerNeg: P_Moins_t0,
				ILastP10ActivePowerNeg_Unit: "kW",
				
				ILastP10ReactivePower: Q_Plus_t0,
				ILastP10ReactivePower_Unit: "kVar",
				ILastP10ReactivePowerNeg  : Q_Moins_t0,
				ILastP10ReactivePowerNeg_Unit: "kVar",
				
				Type_P10 : type_t0,

				'timestamp_t-1': Date_t1,
				'ILastP10ActivePower_t-1': P_Plus_t1,
				'ILastP10ActivePower_t-1_Unit': "kW",
				'ILastP10ActivePowerNeg_t-1': P_Moins_t1,
				'ILastP10ActivePowerNeg_t-1_Unit': "kW",
				
				'ILastP10ReactivePower_t-1': Q_Plus_t1,
				'ILastP10ReactivePower_t-1_Unit': "kVar",
				'ILastP10ReactivePowerNeg_t-1' : Q_Moins_t1,
				'ILastP10ReactivePowerNeg_t-1_Unit': "kVar",
				
				'Type_P10_t-1' : type_t1,
			};			
		}

		if (Profile === 7) //Profile 7- Multi-load - Load curves
		{
			output.data.frame.profileLabel = "7- Multi-load - Load curves";

			let Date_t0 = null;
			if (is_default_u32(readBytes(input.bytes, 2, 4)))
				output.warnings.push('t0 values are not available')
			else if (readBytes(input.bytes, 2, 4) < 20*165*24*60*60)
				output.warnings.push('Datetime t0 is not set correctly')
			else
				Date_t0 =new Date( (readBytes(input.bytes, 2, 4)*1000) + Date.UTC(2000,0,1,0,0,0) );
			let P_Plus_t0_load1 = is_default_u32(readBytes(input.bytes, 6, 4)) ? null : (readBytes(input.bytes, 6, 4))/1000;
			let P_Plus_t0_load2 = is_default_u32(readBytes(input.bytes, 10, 4)) ? null : (readBytes(input.bytes, 10, 4))/1000;
			let P_Plus_t0_load3 = is_default_u32(readBytes(input.bytes, 14, 4)) ? null : (readBytes(input.bytes, 14, 4))/1000;
			let P_Plus_t0_load4 = is_default_u32(readBytes(input.bytes, 18, 4)) ? null : (readBytes(input.bytes, 18, 4))/1000;
			let type_t0 = is_default_u16(readBytes(input.bytes, 22, 2)) ? null : readBytes(input.bytes, 22, 2);

			let Date_t1 = null;
			if (is_default_u32(readBytes(input.bytes, 24, 4)))
				output.warnings.push('t-1 values are not available')
			else if (readBytes(input.bytes, 24, 4) < 20*165*24*60*60)
				output.warnings.push('Datetime t-1 is not set correctly')
			else
				Date_t1 =new Date( (readBytes(input.bytes, 24, 4)*1000) + Date.UTC(2000,0,1,0,0,0) );
			let P_Plus_t1_load1 = is_default_u32(readBytes(input.bytes, 28, 4)) ? null : (readBytes(input.bytes, 28, 4))/1000;
			let P_Plus_t1_load2 = is_default_u32(readBytes(input.bytes, 32, 4)) ? null : (readBytes(input.bytes, 32, 4))/1000;
			let P_Plus_t1_load3 = is_default_u32(readBytes(input.bytes, 36, 4)) ? null : (readBytes(input.bytes, 36, 4))/1000;
			let P_Plus_t1_load4 = is_default_u32(readBytes(input.bytes, 40, 4)) ? null : (readBytes(input.bytes, 40, 4))/1000;
			let type_t1 = (readBytes(input.bytes, 44, 2));

			DIaVM = (readBytes(input.bytes, 46, 2));
			Decode_DIaVM = true;
			CounterStatus = (readBytes(input.bytes, 48, 2));
			Decode_CounterStatus = true;
		
			output.data = {
				...output.data,
				
				timestamp_t0: Date_t0,
				ILastP10ActivePower_Load1: P_Plus_t0_load1,
				ILastP10ActivePower_Load1_Unit: "kW",
				ILastP10ActivePower_Load2: P_Plus_t0_load2,
				ILastP10ActivePower_Load2_Unit: "kW",
				ILastP10ActivePower_Load3: P_Plus_t0_load3,
				ILastP10ActivePower_Load3_Unit: "kW",
				ILastP10ActivePower_Load4: P_Plus_t0_load4,
				ILastP10ActivePower_Load4_Unit: "kW",

				'timestamp_t-1': Date_t1,
				'ILastP10ActivePower_Load1_t-1': P_Plus_t1_load1,
				'ILastP10ActivePower_Load1_t-1_Unit': "kW",
				'ILastP10ActivePower_Load2_t-1': P_Plus_t1_load2,
				'ILastP10ActivePower_Load2_t-1_Unit': "kW",
				'ILastP10ActivePower_Load3_t-1': P_Plus_t1_load3,
				'ILastP10ActivePower_Load3_t-1_Unit': "kW",
				'ILastP10ActivePower_Load4_t-1': P_Plus_t1_load4,
				'ILastP10ActivePower_Load4_t-1_Unit': "kW",
			};
		}
	
		//-----------------------------------------------------
		// common part of some Profile
		//-----------------------------------------------------
		
		// Digital Inputs and VirtualMonitor (iTR)
		if (Decode_DIaVM)  
		{
			output.data = {
				...output.data,

				IInputFct01: (DIaVM & 0x0001) ? 1 : 0,
				IInputFct02: (DIaVM & 0x0002) ? 1 : 0,
				IInputFct03: (DIaVM & 0x0004) ? 1 : 0,
				IInputFct04: (DIaVM & 0x0008) ? 1 : 0,
				IInputFct05: (DIaVM & 0x0010) ? 1 : 0,
				IInputFct06: (DIaVM & 0x0020) ? 1 : 0,
				IInputFct07: (DIaVM & 0x0040) ? 1 : 0,
				IInputFct08: (DIaVM & 0x0080) ? 1 : 0,
				IInputFct09: (DIaVM & 0x0100) ? 1 : 0,
				IInputFct10: (DIaVM & 0x0200) ? 1 : 0,

				CT1: (DIaVM & 0x0400) ? 1 : 0,
				CT2: (DIaVM & 0x0800) ? 1 : 0,
				CT3: (DIaVM & 0x1000) ? 1 : 0,
				CT4: (DIaVM & 0x2000) ? 1 : 0
			};

			if (Decode_CounterStatus)  // Digital Inputs and VirtualMonitor (iTR)
			{
				output.data = {
					...output.data,

					Input1Cpt: (CounterStatus & 0x000F),
					Input2Cpt: ((CounterStatus & 0x00F0) >> 4),
					Input3Cpt: ((CounterStatus & 0x0F00) >> 8),
					Input4Cpt: ((CounterStatus & 0xF000) >> 12)
				};
			}

			// Date
			const PROFILE_WITHOUT_TIMESTAMP = [0, 6, 7];
			if (!(PROFILE_WITHOUT_TIMESTAMP.includes(Profile))) 
			{
				if(NbSecond===0)
					output.warnings.push('Datetime is not set correctly')
				output.data.timestamp = (NbSecond === 0 ) ? null : new Date( (NbSecond*1000) + Date.UTC(2000,0,1,0,0,0) );
			}
		}
	}

	// configuration
	if (MsgType == 1) 
	{
		output.data.frame.frame_type = 1;
		output.data.frame.frame_type_label = "Configuration settings"

		if (input.bytes.length == 2) {
			if (input.bytes[1] === 1)
				output.data.Config_settings_content = "B-10L ask the date & hour";
		} else 
			output.errors.push("error, payload lenght must be 2 bytes");
	}

	return output;
}