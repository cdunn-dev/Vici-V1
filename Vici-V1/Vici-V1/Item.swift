//
//  Item.swift
//  Vici-V1
//
//  Created by Chris Dunn on 24/03/2025.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
